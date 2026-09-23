"use client";
import {useEffect,useRef,useState} from 'react';
import type * as Leaflet from 'leaflet';
import type {GeoJsonObject} from 'geojson';
import {Maximize2,MapPin} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {STATUS_COLORS,shortStatus,type RecordRow} from '@/lib/sigbm';
const UF_CODES:Record<string,string>={'11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO','21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'};
export default function StructureMap({rows,onSelect,onState}:{rows:RecordRow[];onSelect:(id:string)=>void;onState:(uf:string)=>void}){
 const element=useRef<HTMLDivElement>(null),map=useRef<Leaflet.Map|null>(null),layer=useRef<Leaflet.LayerGroup|null>(null),lib=useRef<typeof Leaflet|null>(null);
 const rowsRef=useRef(rows),selectRef=useRef(onSelect),stateRef=useRef(onState);rowsRef.current=rows;selectRef.current=onSelect;stateRef.current=onState;
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 const fit=()=>{const L=lib.current,m=map.current;if(!L||!m)return;const pts=rowsRef.current.filter(r=>r.lat!==null&&r.lon!==null).map(r=>[r.lat!,r.lon!] as Leaflet.LatLngTuple);m.fitBounds(pts.length?L.latLngBounds(pts):L.latLngBounds([[-34,-74],[6,-32]]),{padding:[32,32],maxZoom:10,animate:false});};
 useEffect(()=>{let cancelled=false;let observer:ResizeObserver|undefined;
  (async()=>{try{
   const L=await import('leaflet');if(cancelled||!element.current)return;lib.current=L;
   const m=L.map(element.current,{zoomControl:false,attributionControl:true,preferCanvas:true,minZoom:3,maxZoom:16,scrollWheelZoom:false});map.current=m;
   L.control.zoom({position:'topright',zoomInTitle:'Aproximar',zoomOutTitle:'Afastar'}).addTo(m);
   m.attributionControl.setPrefix(false);m.attributionControl.addAttribution('Estruturas: <a href="https://sigbm.anm.gov.br/publico" target="_blank" rel="noreferrer">ANM / SIGBM</a> · Malha: <a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3" target="_blank" rel="noreferrer">IBGE</a>');
   const response=await fetch((process.env.NEXT_PUBLIC_BASE_PATH||'')+'/brasil-uf.geojson');if(!response.ok)throw new Error('A malha geográfica não pôde ser carregada.');const geo=await response.json() as GeoJsonObject;if(cancelled)return;
   L.geoJSON(geo,{style:{color:'#fff',weight:1.2,fillColor:'#d6e3ea',fillOpacity:1},onEachFeature:(f,l)=>{const uf=UF_CODES[String(f.properties?.codarea)]||'';const label=document.createElement('span');label.textContent=uf+' · filtrar estado';l.bindTooltip(label,{sticky:true,className:'uf-tooltip'});l.on('click',()=>stateRef.current(uf));}}).addTo(m);
   layer.current=L.layerGroup().addTo(m);m.fitBounds([[-34,-74],[6,-32]],{padding:[15,15]});setReady(true);
   observer=new ResizeObserver(()=>{m.invalidateSize();});observer.observe(element.current);
  }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Não foi possível abrir o mapa.');}})();
  return()=>{cancelled=true;observer?.disconnect();map.current?.remove();map.current=null;layer.current=null;};
 },[]);
 useEffect(()=>{const L=lib.current,m=map.current,group=layer.current;if(!ready||!L||!m||!group)return;group.clearLayers();const pairs=new Map<string,RecordRow[]>();for(const r of rows){if(r.lat===null||r.lon===null)continue;const k=r.lat+','+r.lon;const values=pairs.get(k)||[];values.push(r);pairs.set(k,values);}
  for(const values of pairs.values()){const r=values[0];const marker=L.circleMarker([r.lat!,r.lon!],{radius:values.length>1?8:5.5,color:'#fff',weight:1.3,fillColor:STATUS_COLORS[r.status]||'#57758d',fillOpacity:.9}).addTo(group);const tip=document.createElement('span');tip.textContent=values.length>1?values.length+' estruturas neste ponto':r.name;marker.bindTooltip(tip,{direction:'top'});const popup=document.createElement('div');popup.className='map-popup';
   for(const item of values){const b=document.createElement('button');b.type='button';const title=document.createElement('strong');title.textContent=item.name;const meta=document.createElement('span');meta.textContent=item.city+' / '+item.uf+' · #'+item.id;const owner=document.createElement('span');owner.textContent=item.owner;const action=document.createElement('em');action.textContent='Ver detalhes';b.appendChild(title);b.appendChild(meta);b.appendChild(owner);b.appendChild(action);b.onclick=()=>{selectRef.current(item.id);m.closePopup();};popup.appendChild(b);}marker.bindPopup(popup,{maxWidth:320,minWidth:240});
  }fit();
 },[rows,ready]);
 const unmapped=rows.filter(r=>r.lat===null).length;
 return <div className="map-card panel">
<div className="panel-heading">
<div>
<h2>
<MapPin size={17}/>Distribuição geográfica</h2>
<p>{rows.length-unmapped} estruturas no mapa{unmapped>0?` · ${unmapped} com coordenadas a revisar`:''}</p>
</div>
<Button variant="outline" size="sm" onClick={fit} disabled={!ready} title="Ajustar o mapa às estruturas do recorte">
<Maximize2 size={15}/>
<span>Ajustar</span>
</Button>
</div>
<div className="map-frame">
<div ref={element} className="map-host" aria-label="Mapa das estruturas de mineração do Brasil"/>{!ready&&!error&&<div className="map-message">Carregando mapa…</div>}{error&&<div className="map-message">{error} As estruturas continuam disponíveis na tabela.</div>}{ready&&!rows.some(r=>r.lat!==null)&&<div className="map-message">{rows.length?'As estruturas deste recorte precisam de revisão das coordenadas.':'Nenhuma estrutura corresponde aos filtros.'}</div>}<div className="map-hint">Clique em um estado para filtrar ou em um ponto para ver detalhes.</div>
</div>
<div className="map-legend">{Object.entries(STATUS_COLORS).map(([status,color])=>
<span key={status}>
<i style={{background:color}}/>{shortStatus(status)}</span>)}</div>
</div>;
}
