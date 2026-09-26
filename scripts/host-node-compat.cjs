const os=require('node:os');
const original=os.userInfo;
os.userInfo=function(options){try{return original.call(os,options);}catch(error){if(error.code!=='ERR_SYSTEM_ERROR')throw error;return {username:process.env.USERNAME||'Windows',homedir:os.homedir(),shell:null,uid:-1,gid:-1};}};
require('node:module').syncBuiltinESMExports();
