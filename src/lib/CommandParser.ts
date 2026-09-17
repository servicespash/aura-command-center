export interface ParsedCommand {
  command: string;
  args: Record<string, string | boolean>;
  raw: string;
}

export function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const firstToken = tokens[0];
  const command = firstToken ? firstToken.toLowerCase() : "";
  const args: Record<string, string | boolean> = {};

  let currentFlag: string | null = null;
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (token.startsWith("--")) {
      currentFlag = token.substring(2);
      args[currentFlag] = true; // default to true if no value follows
    } else if (token.startsWith("-")) {
      currentFlag = token.substring(1);
      args[currentFlag] = true;
    } else if (currentFlag) {
      args[currentFlag] = token;
      currentFlag = null;
    } else {
      // Positional args
      args[`pos_${i}`] = token;
    }
  }
  return { command, args, raw: input };
}
