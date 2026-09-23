export const SOURCE_HEADERS = ["Codigo","NomeBarragem","NomeEmpreendedor","CpfCnpjFormatado","LatitudeFormatada","LongitudeFormatada","CoordenadaSIRGAFormatado","Municipio","UF","Minerio","Altura","VolumeAtualFormatado","MetodoConstrutivoFormatado","CategoriaRisco","DanoPotencial","GestaoOperacional","InseridaPNSBFormatada","SituacaoNivelEmergencial","SituacaoDeclaracaoCondicaoEstabilidade","SituacaoDeclaracaoCondicaoEstabilidadeRPSB","SituacaoDeclaracaoConformidadeOperacionalidade","SituacaoOperacionalFormatado","StatusEmbargo","UnidadeGestora"] as const;
export type SourceRow = Record<string,string>;
export type Dataset = { schemaVersion:1; referenceDate:string; fileName:string; headers:string[]; rows:SourceRow[]; revision:string; importedAt?:string };
export type RecordRow = { id:string; name:string; owner:string; ownerKey:string; document:string; cnpj:string|null; uf:string; city:string; mineral:string; status:string; height:number|null; volume:number|null; lat:number|null; lon:number|null; issues:string[]; raw:SourceRow };
export type Filters = { query:string; categories:Record<string,string[]>; heightMin:string; heightMax:string; volumeMin:string; volumeMax:string; includeUnknownDimensions:boolean };
export const EMPTY_FILTERS: Filters = {query:"",categories:{},heightMin:"",heightMax:"",volumeMin:"",volumeMax:"",includeUnknownDimensions:true};
export const MISSING="__not_informed__";
export const STATUS_COLORS:Record<string,string>={"Ativa":"#087fa8","Em Construção":"#d28b18","Inativa":"#687b91","Em descaracterização (projeto/obras/monitoramento)":"#8462b2"};
export const FIELD_LABELS:Record<string,string>={Codigo:"Código SIGBM",NomeBarragem:"Estrutura",NomeEmpreendedor:"Empreendedor",CpfCnpjFormatado:"CPF/CNPJ",LatitudeFormatada:"Latitude original",LongitudeFormatada:"Longitude original",CoordenadaSIRGAFormatado:"Hemisfério informado",Municipio:"Município",UF:"UF",Minerio:"Minério",Altura:"Altura (m)",VolumeAtualFormatado:"Volume atual (m³)",MetodoConstrutivoFormatado:"Método construtivo",CategoriaRisco:"Categoria de risco (CRI)",DanoPotencial:"Dano potencial associado (DPA)",GestaoOperacional:"Gestão operacional",InseridaPNSBFormatada:"Inserida na PNSB",SituacaoNivelEmergencial:"Alerta e emergência",SituacaoDeclaracaoCondicaoEstabilidade:"DCE — campanha",SituacaoDeclaracaoCondicaoEstabilidadeRPSB:"DCE — revisão periódica",SituacaoDeclaracaoConformidadeOperacionalidade:"DCO",SituacaoOperacionalFormatado:"Situação operacional",StatusEmbargo:"Embargo",UnidadeGestora:"Unidade gestora ANM",ownerKey:"Empreendedor",quality:"Qualidade dos dados"};
export const ISSUE_LABELS:Record<string,string>={coordinates:"Coordenadas a revisar",document:"Documento oculto ou não identificado",mineral:"Minério não informado",height:"Altura inválida",volume:"Volume inválido",dimensions:"Altura ou volume zerado",method:"Método construtivo indefinido"};
export const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
export const displayValue=(s:string)=>!s.trim()||s.trim()==="-"?"Não informado":s.trim();
export const shortStatus=(s:string)=>s.startsWith("Em descaracterização")?"Em descaracterização":s;
export const formatNumber=(v:number|null,digits=0)=>v===null?"Não informado":v.toLocaleString("pt-BR",{maximumFractionDigits:digits});
export const formatDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split("-").reverse().join("/"):v;
export const percent=(n:number,total:number)=>total?100*n/total:0;

// Quotes inside unquoted DMS coordinates are literal in ANM's export.
// Quoted CSV cells, escaped quotes and embedded newlines are also supported.
export function parseCSV(text:string): {headers:string[];rows:SourceRow[]} {
 const input=text.replace(/^\uFEFF/,"");
 const first=input.split(/\r?\n/,1)[0];
 const delimiter=[";","\t",","].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
 const matrix:string[][]=[];let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else quoted=false;}else cell+=c;continue;}
  if(c==='"'&&cell.length===0){quoted=true;continue;}
  if(c===delimiter){row.push(cell);cell="";continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))matrix.push(row);row=[];cell="";continue;}
  cell+=c;
 }
 if(quoted)throw new Error("O CSV contém aspas sem fechamento. Exporte novamente o arquivo pelo SIGBM.");
 row.push(cell);if(row.some(x=>x.trim()))matrix.push(row);
 if(matrix.length<2)throw new Error("O arquivo não contém registros para importar.");
 const headers=matrix.shift()!.map(x=>x.trim());
 if(new Set(headers).size!==headers.length)throw new Error("Há colunas repetidas no arquivo.");
 const missing=SOURCE_HEADERS.filter(x=>!headers.includes(x));
 if(missing.length)throw new Error("Faltam colunas da exportação SIGBM: "+missing.join(", ")+".");
 if(matrix.length>20000||headers.length>100)throw new Error("O arquivo excede o limite de 20.000 registros ou 100 colunas.");
 const seen=new Set<string>();
 const rows=matrix.map((values,index)=>{
  if(values.length!==headers.length)throw new Error(`A linha ${index+2} tem ${values.length} campos; eram esperados ${headers.length}.`);
  const raw=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
  const id=raw.Codigo.trim();
  if(!id)throw new Error(`Código SIGBM ausente na linha ${index+2}.`);
  if(seen.has(id))throw new Error(`O código SIGBM ${id} está repetido. Revise a exportação antes de importar.`);
  seen.add(id);return raw;
 });
 return {headers,rows};
}
export function validDate(s:string){const d=new Date(s+"T12:00:00Z");return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function parseNumber(s:string):number|null {
 const t=s.trim();if(!/^-?\d+(?:\.\d{3})*(?:,\d+)?$/.test(t))return null;
 const n=Number(t.replace(/\./g,"").replace(",","."));return Number.isFinite(n)?n:null;
}
export function parseCoordinate(s:string,latitude:boolean):number|null {
 const m=s.trim().match(/^(-?)(\d{1,3})°(\d{1,2})'(\d{1,2}(?:[.,]\d+)?)"$/);
 if(!m)return null;
 const deg=Number(m[2]),min=Number(m[3]),sec=Number(m[4].replace(",","."));
 if(min>=60||sec>=60)return null;
 const value=(m[1]?-1:1)*(deg+min/60+sec/3600);
 return Math.abs(value)>(latitude?90:180)?null:value;
}
export function prepareRow(raw:SourceRow):RecordRow {
 const read=(k:string)=>(raw[k]??"").trim();
 const document=read("CpfCnpjFormatado");const cnpj=/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(document)?document.replace(/\D/g,""):null;
 const owner=read("NomeEmpreendedor")||"Empreendedor não informado";
 let lat=parseCoordinate(read("LatitudeFormatada"),true),lon=parseCoordinate(read("LongitudeFormatada"),false);
 const hemi=read("CoordenadaSIRGAFormatado");
 if(lat!==null&&lon!==null&&(lat < -34||lat>6||lon < -74||lon > -28||(hemi==="Sul do Equador"&&lat>0)||(hemi==="Norte do Equador"&&lat<0))){lat=null;lon=null;}
 const height=parseNumber(read("Altura")),volume=parseNumber(read("VolumeAtualFormatado"));
 const mineral=displayValue(read("Minerio"));const issues:string[]=[];
 if(lat===null||lon===null){lat=null;lon=null;issues.push("coordinates");}
 if(!cnpj)issues.push("document");
 if(mineral==="Não informado")issues.push("mineral");
 if(height===null||height<0)issues.push("height");
 if(volume===null||volume<0)issues.push("volume");
 if(height===0||volume===0)issues.push("dimensions");
 if(!read("MetodoConstrutivoFormatado")||read("MetodoConstrutivoFormatado")==="Indefinido")issues.push("method");
 return {id:read("Codigo"),name:read("NomeBarragem")||"Estrutura sem nome",owner,ownerKey:cnpj?"cnpj:"+cnpj:"nome:"+normalize(owner),document,cnpj,uf:read("UF"),city:read("Municipio"),mineral,status:read("SituacaoOperacionalFormatado"),height,volume,lat,lon,issues,raw};
}
export const prepareRows=(data:Dataset)=>data.rows.map(prepareRow);
export function categoryValue(r:RecordRow,key:string):string {if(key==="ownerKey")return r.ownerKey;const s=(r.raw[key]??"").trim();return !s||s==="-"?MISSING:s;}
export function filterRows(rows:RecordRow[],filters:Filters):RecordRow[] {
 const q=normalize(filters.query);const onlyDigits=q.replace(/\D/g,"");
 const bounds=(value:number|null,min:string,max:string,mult=1)=>{
  if(!min&&!max)return true;
  if(value===null||value<=0)return filters.includeUnknownDimensions;
  return (!min||value>=Number(min.replace(",","."))*mult)&&(!max||value<=Number(max.replace(",","."))*mult);
 };
 return rows.filter(r=>{
  if(q&&!normalize([r.id,r.name,r.owner,r.document,r.uf,r.city,r.mineral].join(" ")).includes(q)&&!(onlyDigits.length>=5&&r.cnpj?.includes(onlyDigits)))return false;
  for(const [k,vs]of Object.entries(filters.categories)){
   if(!vs.length)continue;
   if(k==="quality"){if(!vs.some(v=>v==="none"?r.issues.length===0:r.issues.includes(v)))return false;}
   else if(!vs.includes(categoryValue(r,k)))return false;
  }
  return bounds(r.height,filters.heightMin,filters.heightMax)&&bounds(r.volume,filters.volumeMin,filters.volumeMax,1e6);
 });
}
export function distribution(rows:RecordRow[],key:string){const m=new Map<string,number>();for(const r of rows){const v=categoryValue(r,key);m.set(v,(m.get(v)||0)+1);}return [...m].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"pt-BR"));}
export type OwnerGroup={key:string;name:string;aliases:string[];document:string;cnpj:string|null;rows:RecordRow[];ufs:string[];count:number};
export function groupOwners(rows:RecordRow[]):OwnerGroup[]{const m=new Map<string,OwnerGroup>();for(const r of rows){let g=m.get(r.ownerKey);if(!g){g={key:r.ownerKey,name:r.owner,aliases:[],document:r.document,cnpj:r.cnpj,rows:[],ufs:[],count:0};m.set(r.ownerKey,g);}g.rows.push(r);g.count++;if(!g.aliases.includes(r.owner))g.aliases.push(r.owner);if(!g.ufs.includes(r.uf))g.ufs.push(r.uf);if(r.owner.length<g.name.length)g.name=r.owner;}return [...m.values()].map(g=>({...g,ufs:g.ufs.sort()})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"pt-BR"));}
export function statistics(rows:RecordRow[]){return {total:rows.length,cnpjs:new Set(rows.flatMap(r=>r.cnpj?[r.cnpj]:[])).size,unidentified:rows.filter(r=>!r.cnpj).length,states:new Set(rows.map(r=>r.uf).filter(Boolean)).size,municipalities:new Set(rows.map(r=>r.uf+"|"+r.city)).size,mapped:rows.filter(r=>r.lat!==null&&r.lon!==null).length,issues:rows.filter(r=>r.issues.length).length};}
export function filterDescription(filters:Filters,owners:OwnerGroup[]=[]):string {
 const parts:string[]=[];if(filters.query)parts.push("Busca: "+filters.query);
 for(const [key,values]of Object.entries(filters.categories)){if(values.length)parts.push((FIELD_LABELS[key]||key)+": "+values.map(v=>key==="ownerKey"?(owners.find(g=>g.key===v)?.name||v):key==="quality"?(ISSUE_LABELS[v]||"Sem alertas"):v===MISSING?"Não informado":v).join(" ou "));}
 if(filters.heightMin||filters.heightMax)parts.push(`Altura (m): ${filters.heightMin||"sem mínimo"} a ${filters.heightMax||"sem máximo"}`);
 if(filters.volumeMin||filters.volumeMax)parts.push(`Volume (milhões m³): ${filters.volumeMin||"sem mínimo"} a ${filters.volumeMax||"sem máximo"}`);
 if(filters.heightMin||filters.heightMax||filters.volumeMin||filters.volumeMax)parts.push(filters.includeUnknownDimensions?"Inclui dimensões zeradas ou a revisar":"Exclui dimensões zeradas ou a revisar");
 return parts.join(" | ")||"Base completa, sem filtros";
}
export function csvCell(value:unknown){let text=String(value??"");if(/^[\s]*[=+@]/.test(text)||(/^[\s]*-/.test(text)&&!/^\s*-?\d+(?:[.,]\d+)*\s*$/.test(text)&&text.trim()!=="-"))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
export const toCSV=(rows:unknown[][])=>"\uFEFF"+rows.map(r=>r.map(csvCell).join(";")).join("\r\n");
export function structureExport(rows:RecordRow[],dataset:Dataset,context:string){const extra=["DataReferencia","ArquivoFonte","ContextoDaSelecao","LatitudeDecimal","LongitudeDecimal","AlertasDados"];return toCSV([[...dataset.headers,...extra],...rows.map(r=>[...dataset.headers.map(h=>r.raw[h]??""),formatDate(dataset.referenceDate),dataset.fileName,context,r.lat===null?"":String(r.lat).replace(".",","),r.lon===null?"":String(r.lon).replace(".",","),r.issues.map(i=>ISSUE_LABELS[i]).join(" | ")])]);}
export function ownerExport(rows:RecordRow[],dataset:Dataset,context:string){return toCSV([["Empreendedor","Documento","CriterioAgrupamento","VariacoesNome","QuantidadeEstruturas","UFs","CodigosSIGBM","Estruturas","Ativas","EmConstrucao","Inativas","EmDescaracterizacao","DataReferencia","ArquivoFonte","ContextoDaSelecao"],...groupOwners(rows).map(g=>[g.name,g.document,g.cnpj?"CNPJ completo":"Nome; documento não identificado",g.aliases.join(" | "),g.count,g.ufs.join(" | "),g.rows.map(r=>r.id).join(" | "),g.rows.map(r=>r.name).join(" | "),g.rows.filter(r=>r.status==="Ativa").length,g.rows.filter(r=>r.status==="Em Construção").length,g.rows.filter(r=>r.status==="Inativa").length,g.rows.filter(r=>r.status.startsWith("Em descaracterização")).length,formatDate(dataset.referenceDate),dataset.fileName,context])]);}
