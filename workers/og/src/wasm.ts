import { initWasm } from '@resvg/resvg-wasm'
// @ts-ignore — imported as binary via wrangler WASM rule
import resvgWasm from '../node_modules/@resvg/resvg-wasm/index_bg.wasm'

let initialized = false

export async function ensureWasm(): Promise<void> {
  if (!initialized) {
    await initWasm(resvgWasm)
    initialized = true
  }
}
