const CACHE='action-os-shell-v1';
const FILES=['./','./index.html','./app.js','./model.js','./templates.js','./style.css','./icon.svg','./manifest.webmanifest'];
// Fetch current files when installing a new version, even if the HTTP cache has older files.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new Request(new URL(path,self.location.href),{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin) return;
  const root=new URL('./',self.location.href);
  const allowed=FILES.map(p=>new URL(p,root).pathname);
  if(!allowed.includes(url.pathname))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(event.request,{ignoreSearch:true});
    // During local development, serve edits immediately while retaining a real offline fallback.
    if(['127.0.0.1','localhost','[::1]'].includes(url.hostname)){
      try{
        const response=await fetch(event.request);
        if(response.ok)await cache.put(event.request,response.clone());
        return response;
      }catch{if(cached)return cached;throw Error('Offline asset unavailable');}
    }
    return cached||fetch(event.request);
  }));
});
