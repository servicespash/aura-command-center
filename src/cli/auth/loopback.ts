import * as http from 'http';
import { URL } from 'url';

export interface LoopbackResult {
  code: string;
  state: string;
}

export class CLILoopbackServer {
  private server: http.Server | null = null;
  private port = 0;
  private expectedState = '';
  private memoryVolatileStore = new Map<string, number>();

  constructor(private startPort: number = 9090, private endPort: number = 9100) {}

  public async start(stateNonce: string): Promise<number> {
    this.expectedState = stateNonce;
    this.memoryVolatileStore.set(stateNonce, Date.now());

    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.handleRequest.bind(this));
      
      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          if (this.startPort < this.endPort) {
            this.startPort++;
            this.server?.listen(this.startPort, '127.0.0.1');
          } else {
            // Fallback to dynamic OS allocation
            this.server?.listen(0, '127.0.0.1');
          }
        } else {
          reject(err);
        }
      });

      this.server.on('listening', () => {
        const address = this.server?.address();
        if (address && typeof address !== 'string') {
          this.port = address.port;
          resolve(this.port);
        } else {
          reject(new Error('Failed to bind to a valid port.'));
        }
      });

      this.server.listen(this.startPort, '127.0.0.1');
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!req.url) {
      this.sendResponse(res, 400, 'Bad Request');
      return;
    }

    try {
      const parsedUrl = new URL(req.url, `http://localhost:${this.port}`);
      
      if (parsedUrl.pathname !== '/callback') {
        this.sendResponse(res, 404, 'Not Found');
        return;
      }

      const code = parsedUrl.searchParams.get('code');
      const state = parsedUrl.searchParams.get('state');

      if (!code || !state) {
        this.sendResponse(res, 400, 'Missing code or state parameters.');
        return;
      }

      if (state !== this.expectedState || !this.memoryVolatileStore.has(state)) {
        this.sendResponse(res, 403, 'State mismatch or nonce expired. PKCE verification failed.');
        return;
      }

      // Successful zero-trace callback handler
      this.memoryVolatileStore.delete(state);
      this.sendResponse(res, 200, 'Authorization successful. You may close this tab and return to the CLI.');
      
      // Dispatch result to listeners
      this.emitResult({ code, state });

      // Clean HTTP response flushing before triggering a delayed server.close()
      setTimeout(() => {
        this.stop();
      }, 500);

    } catch (err) {
      console.error('[CLI Loopback] Request handling error:', err);
      this.sendResponse(res, 500, 'Internal Server Error');
    }
  }

  private sendResponse(res: http.ServerResponse, statusCode: number, message: string): void {
    res.writeHead(statusCode, {
      'Content-Type': 'text/plain',
      'Connection': 'close',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(message);
  }

  private onResultCallback: ((result: LoopbackResult) => void) | null = null;

  public onResult(callback: (result: LoopbackResult) => void): void {
    this.onResultCallback = callback;
  }

  private emitResult(result: LoopbackResult): void {
    if (this.onResultCallback) {
      this.onResultCallback(result);
    }
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
