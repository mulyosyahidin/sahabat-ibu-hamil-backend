import { defineConfig } from 'tsup';
import path from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'node20',
  sourcemap: true,
  clean: true,
  splitting: false,
  dts: false,
  treeshake: false,
  minify: false,
  bundle: true,
  external: [
    '@prisma/client',
    'mysql2',
    'bcrypt',
    '@whiskeysockets/baileys',
    'qrcode-terminal',
    'socket.io',
    'openai',
    'pino'
  ],
  outExtension: () => ({ js: '.cjs' }),
  esbuildOptions(options) {
    options.alias = {
      '@': path.resolve(__dirname, 'src'),
    };
    options.platform = 'node';
  },
});
