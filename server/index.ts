import {createTempleServer} from './app.ts';
const {game}=createTempleServer();
await game.listen(Number(process.env.PORT??2567),'0.0.0.0');
console.log('An Nhien room server: http://localhost:'+ (process.env.PORT??2567));
