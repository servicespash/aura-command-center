export async function loadWasmModule(url: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const module = await WebAssembly.instantiate(buffer);
  return module.instance.exports;
}
