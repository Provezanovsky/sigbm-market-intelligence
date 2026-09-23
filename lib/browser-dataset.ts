import type {Dataset} from "./sigbm";

const DATABASE = "sigbm-market-intelligence";
const STORE = "datasets";
const KEY = "current";

function openDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

export async function loadBrowserDataset(fallback:Dataset):Promise<Dataset>{
  if(typeof indexedDB==="undefined")return fallback;
  try{
    const database=await openDatabase();
    const value=await new Promise<Dataset|undefined>((resolve,reject)=>{
      const transaction=database.transaction(STORE,"readonly");
      const request=transaction.objectStore(STORE).get(KEY);
      request.onsuccess=()=>resolve(request.result as Dataset|undefined);
      request.onerror=()=>reject(request.error);
    });
    database.close();
    return value?.schemaVersion===1&&Array.isArray(value.rows)?value:fallback;
  }catch{
    return fallback;
  }
}

export async function saveBrowserDataset(dataset:Dataset):Promise<void>{
  if(typeof indexedDB==="undefined")throw new Error("Este navegador não oferece armazenamento local para a base.");
  const database=await openDatabase();
  await new Promise<void>((resolve,reject)=>{
    const transaction=database.transaction(STORE,"readwrite");
    transaction.objectStore(STORE).put(dataset,KEY);
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(transaction.error);
    transaction.onabort=()=>reject(transaction.error);
  });
  database.close();
}
