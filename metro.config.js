const path = require('path')
const {getDefaultConfig} = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

config.resolver ={
    ...config.resolver,
sourceExts: ['jsx','js','ts','tsx','json','cjs'],
resolverMainFields:['react-native','browser','main'],
nodeModulesPaths:[path.resolve(__dirname,'node_modules')]
};


module.exports=config;