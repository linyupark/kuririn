import typescript from '@rollup/plugin-typescript'
import { uglify } from 'rollup-plugin-uglify'

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/kuririn.min.js',
    format: 'iife',
    name: 'Kuririn',
  },
  plugins: [
    typescript(),
    uglify({
      sourcemap: false,
    }),
  ],
}
