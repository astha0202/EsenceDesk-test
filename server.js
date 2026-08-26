import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const root = process.cwd();
// Minimal .env loader so no third-party dependency is required.
try {
  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i <= 0) continue;
      const k = trimmed.slice(0, i).trim();
      let v = trimmed.slice(i + 1).trim();
      if ((v.startsWith('\"') && v.endsWith('\"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  }
} catch (_) {}
const port = Number(process.env.PORT || 5500);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.ico':'image/x-icon'};

function json(res, status, body){
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}
function requestHttps(url, options={}){
  return new Promise((resolve,reject)=>{
    const req=https.request(url,{method:options.method||'GET',headers:options.headers||{}},r=>{
      let data=''; r.on('data',c=>data+=c); r.on('end',()=>resolve({status:r.statusCode||500,headers:r.headers,body:data}));
    });
    req.on('error',reject);
    if(options.body) req.write(options.body);
    req.end();
  });
}

async function getAccessToken(){
  const {GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN}=process.env;
  if(!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) throw new Error('Google OAuth credentials are not configured');
  const body=new URLSearchParams({client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,refresh_token:GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'}).toString();
  const r=await requestHttps('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body)},body});
  const data=JSON.parse(r.body||'{}');
  if(r.status>=300 || !data.access_token) throw new Error(data.error_description||'Unable to refresh Google OAuth token');
  return data.access_token;
}

async function getAllReviews(){
  const location=process.env.GOOGLE_LOCATION_RESOURCE;
  if(!location) throw new Error('GOOGLE_LOCATION_RESOURCE is not configured');
  const token=await getAccessToken();
  let pageToken=''; const reviews=[];
  do{
    const u=new URL(`https://mybusiness.googleapis.com/v4/${location}/reviews`);
    u.searchParams.set('pageSize','50');
    if(pageToken) u.searchParams.set('pageToken',pageToken);
    const r=await requestHttps(u.toString(),{headers:{Authorization:`Bearer ${token}`} });
    const data=JSON.parse(r.body||'{}');
    if(r.status>=300) throw new Error(data.error?.message||`Google API returned ${r.status}`);
    for(const x of (data.reviews||[])){
      const ratingMap={STAR_RATING_UNSPECIFIED:0,ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
      reviews.push({
        id:x.reviewId||x.name,
        reviewerName:x.reviewer?.displayName||'Google user',
        profilePhotoUrl:x.reviewer?.profilePhotoUrl||'',
        reviewerUrl:x.reviewer?.profileUrl||'',
        comment:x.comment||'',
        starRating:ratingMap[x.starRating] ?? 0,
        createTime:x.createTime||'',
        updateTime:x.updateTime||'',
        reviewReply:x.reviewReply?.comment||''
      });
    }
    pageToken=data.nextPageToken||'';
  }while(pageToken);
  return reviews;
}

function serveStatic(req,res){
  let pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/') pathname='/index.html';
  const file=path.normalize(path.join(root,pathname));
  if(!file.startsWith(root)) return json(res,403,{error:'forbidden'});
  fs.stat(file,(err,st)=>{
    if(err||!st.isFile()) return json(res,404,{error:'not found'});
    const ext=path.extname(file).toLowerCase();
    res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/reviews'){
    try{
      const reviews=await getAllReviews();
      return json(res,200,{source:'google-business-profile',fetchedAt:new Date().toISOString(),reviews});
    }catch(err){
      return json(res,503,{source:'static-fallback',configured:false,error:err.message,reviews:[]});
    }
  }
  if(url.pathname==='/api/reviews/status'){
    const configured=Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REFRESH_TOKEN&&process.env.GOOGLE_LOCATION_RESOURCE);
    return json(res,200,{configured});
  }
  serveStatic(req,res);
});

server.listen(port,()=>console.log(`eSenceDesk running at http://localhost:${port}`));
