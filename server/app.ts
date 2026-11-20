import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { TempleRoom } from './TempleRoom.ts';
const root=resolve('dist');
const serveSite=async(req:IncomingMessage,res:ServerResponse)=>{
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url??'/', 'http://localhost').pathname);
    let path=resolve(root,'.'+pathname);
    if(path!==root&&!path.startsWith(root+'/')&&!path.startsWith(root+'\\')){res.writeHead(403);res.end();return;}
    if(!extname(path))path=resolve(root,'index.html');
    const body=await readFile(path);
    const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
    res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
};
export function createTempleServer(){
  const http=createServer();
  const transport=new WebSocketTransport({server:http});
  const game=new Server({transport,greet:false,express:app=>{app.use(serveSite);}});
  game.define('temple',TempleRoom);
  return {game,http};
}
