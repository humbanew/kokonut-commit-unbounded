// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

function onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
        const cycle = warning.cycle || []
        if (
            Array.isArray(cycle) &&
            cycle.some((id) => /@actions[\\/]core/.test(id))
        ) {
            return
        }
    }
    warn(warning)
}

const config1 = {
    input: 'src/index.ts',
    external: ['@actions/core'],
    output: {
        esModule: true,
        file: 'dist/index.js',
        format: 'es',
        sourcemap: true
    },
    onwarn,
    plugins: [
        nodeResolve({ extensions: ['.ts', '.js'], preferBuiltins: true }),
        typescript(),
        commonjs()
    ]
}

const config2 = {
    input: 'src/cli.ts',
    external: ['@actions/core'],
    output: {
        file: 'dist/cli.cjs',
        format: 'cjs',
        sourcemap: false
    },
    onwarn,
    plugins: [
        nodeResolve({ extensions: ['.ts', '.js'], preferBuiltins: true }),
        typescript(),
        commonjs()
    ]
}

export default [config1, config2]
