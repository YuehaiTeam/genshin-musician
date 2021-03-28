module.exports = {
    pluginOptions: {
        electronBuilder: {
            externals: ['iohook', 'bindings'],
            nodeIntegration: true,
            chainWebpackMainProcess: (config) => {
                // Chain webpack config for electron main process only
                config.externals({
                    bindings: "commonjs2 bindings",
                    iohook: "commonjs2 iohook"
                })
            },
        }
    }
}