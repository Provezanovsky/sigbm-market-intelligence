"use client";
import {useCallback,useEffect,useId,useMemo,useRef,useState} from 'react';
import {Search,SlidersHorizontal,Download,Upload,Layers3,Building2,MapPinned,MapPin,ArrowUpDown,ArrowRight,ChevronDown,ChevronLeft,ChevronRight,RotateCcw,X,Info,TriangleAlert,Check,FileText,ChartNoAxesCombined,ClipboardList} from 'lucide-react';
import {ColumnDef,SortingState,flexRender,getCoreRowModel,getPaginationRowModel,getSortedRowModel,useReactTable} from '@tanstack/react-table';
import {PieChart,Pie,Cell,Tooltip} from 'recharts';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetClose} from '@/components/ui/sheet';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuLabel} from '@/components/ui/dropdown-menu';
import {Combobox,ComboboxChips,ComboboxChip,ComboboxChipsInput,ComboboxContent,ComboboxList,ComboboxItem,ComboboxEmpty,ComboboxValue,useComboboxAnchor} from '@/components/ui/combobox';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Pagination,PaginationContent,PaginationItem} from '@/components/ui/pagination';
import {ChartContainer} from '@/components/ui/chart';
import {Empty,EmptyHeader,EmptyTitle,EmptyDescription} from '@/components/ui/empty';
import {Toaster} from '@/components/ui/sonner';
import {toast} from 'sonner';
import StructureMap from './structure-map';
import initialDataset from '@/data/initial.json';
import {loadBrowserDataset,saveBrowserDataset} from '@/lib/browser-dataset';
import {EMPTY_FILTERS,FIELD_LABELS,ISSUE_LABELS,MISSING,STATUS_COLORS,categoryValue,displayValue,distribution,filterDescription,filterRows,formatDate,formatNumber,groupOwners,normalize,ownerExport,parseCSV,percent,prepareRows,shortStatus,statistics,structureExport,validDate,type Dataset,type Filters,type OwnerGroup,type RecordRow} from '@/lib/sigbm';

type LoadedDataset=Dataset;
const fmt=formatNumber;
const primaryFields=['UF','Municipio','SituacaoOperacionalFormatado','ownerKey','Minerio'];
const advancedFields=['MetodoConstrutivoFormatado','InseridaPNSBFormatada','CategoriaRisco','DanoPotencial','GestaoOperacional','SituacaoNivelEmergencial','StatusEmbargo','SituacaoDeclaracaoCondicaoEstabilidade','SituacaoDeclaracaoCondicaoEstabilidadeRPSB','SituacaoDeclaracaoConformidadeOperacionalidade','UnidadeGestora','quality'];
function optionLabel(key:string,v:string,owners:OwnerGroup[]){if(v===MISSING)return 'Não informado';if(key==='ownerKey'){const g=owners.find(x=>x.key===v);return g?g.name+' · '+(g.cnpj?g.document:'documento oculto'):v;}if(key==='quality')return ISSUE_LABELS[v]||'Sem alertas';return key==='SituacaoOperacionalFormatado'?shortStatus(v):v;}
function FilterPicker({field,options,values,onChange,owners}:{field:string;options:string[];values:string[];onChange:(v:string[])=>void;owners:OwnerGroup[]}){
 const anchor=useComboboxAnchor(),id=useId();
 const label=(v:string)=>optionLabel(field,v,owners);
 return <div className="filter-field">
<label htmlFor={id}>{FIELD_LABELS[field]||field}</label>
<Combobox multiple items={options} value={values} onValueChange={onChange} itemToStringLabel={label} filter={(item,query)=>normalize(label(item)).includes(normalize(query))}>
  <ComboboxChips ref={anchor} className="filter-picker">
<ComboboxValue>{(selected:string[])=>
<>{selected.map(v=>
<ComboboxChip key={v} title={label(v)}>{label(v)}</ComboboxChip>)}<ComboboxChipsInput id={id} aria-label={FIELD_LABELS[field]} placeholder={selected.length?'Adicionar…':'Todos'}/>
</>}</ComboboxValue>
</ComboboxChips>
  <ComboboxContent anchor={anchor} className="filter-options">
<ComboboxEmpty>Nenhum valor encontrado.</ComboboxEmpty>
<ComboboxList>{(item:string)=>
<ComboboxItem key={item} value={item}>{label(item)}</ComboboxItem>}</ComboboxList>
</ComboboxContent>
 </Combobox>
</div>;
}
function FiltersPanel({rows,filters,setFilters,owners}:{rows:RecordRow[];filters:Filters;setFilters:(f:Filters)=>void;owners:OwnerGroup[]}){
 const rangeId=useId();const [advanced,setAdvanced]=useState(false);
 const setCategory=(key:string,values:string[])=>setFilters({...filters,categories:{...filters.categories,[key]:values}});
 const options=(key:string)=>key==='ownerKey'?owners.map(x=>x.key):key==='quality'?[...Object.keys(ISSUE_LABELS),'none']:[...new Set(rows.filter(r=>key!=='Municipio'||!filters.categories.UF?.length||filters.categories.UF.includes(r.uf)).map(r=>categoryValue(r,key)))].sort((a,b)=>optionLabel(key,a,owners).localeCompare(optionLabel(key,b,owners),'pt-BR'));
 return <div className="filters-content">
<div className="filters-title">
<h2>
<SlidersHorizontal size={17}/>Filtros</h2>
<button className="text-button" onClick={()=>setFilters({...EMPTY_FILTERS,categories:{}})}>Limpar</button>
</div>
<p className="filter-help">Combine critérios para definir seu recorte.</p>
<div className="filter-fields">{primaryFields.map(key=>
<FilterPicker key={key} field={key} options={options(key)} values={filters.categories[key]||[]} onChange={v=>{if(key==='UF')setFilters({...filters,categories:{...filters.categories,UF:v,Municipio:[]}});else setCategory(key,v);}} owners={owners}/>)}</div>
<button className="advanced-toggle" onClick={()=>setAdvanced(!advanced)} aria-expanded={advanced}>Características e classificações <ChevronDown className={advanced?'rotate':''} size={17}/>
</button>{advanced&&<div className="advanced-fields">{advancedFields.map(key=>
<FilterPicker key={key} field={key} options={options(key)} values={filters.categories[key]||[]} onChange={v=>setCategory(key,v)} owners={owners}/>)}<div className="dimension-filter">
<label>Altura (m)</label>
<div className="range-fields">
<Input type="number" min="0" step="any" placeholder="Mínima" aria-label="Altura mínima em metros" value={filters.heightMin} onChange={e=>setFilters({...filters,heightMin:e.target.value})}/>
<span>a</span>
<Input type="number" min="0" step="any" placeholder="Máxima" aria-label="Altura máxima em metros" value={filters.heightMax} onChange={e=>setFilters({...filters,heightMax:e.target.value})}/>
</div>
<label>Volume (milhões de m³)</label>
<div className="range-fields">
<Input type="number" min="0" step="any" placeholder="Mínimo" aria-label="Volume mínimo em milhões de metros cúbicos" value={filters.volumeMin} onChange={e=>setFilters({...filters,volumeMin:e.target.value})}/>
<span>a</span>
<Input type="number" min="0" step="any" placeholder="Máximo" aria-label="Volume máximo em milhões de metros cúbicos" value={filters.volumeMax} onChange={e=>setFilters({...filters,volumeMax:e.target.value})}/>
</div>
<div className="checkbox-line">
<Checkbox id={rangeId} checked={filters.includeUnknownDimensions} onCheckedChange={v=>setFilters({...filters,includeUnknownDimensions:v===true})}/>
<label htmlFor={rangeId}>Incluir dimensões zeradas ou a revisar</label>
</div>
</div>
</div>}<div className="filter-footnote">
<Info size={16}/>
<p>Estruturas são pontos de partida para qualificar projetos. A base não informa demanda de QA/QC nem intenção de compra.</p>
</div>
</div>;
}
function Status({value}:{value:string}){return <span className="status-badge">
<i style={{background:STATUS_COLORS[value]||'#718498'}}/>{shortStatus(value)}</span>;}
function Blank({clear}:{clear?:()=>void}){return <Empty className="empty-result">
<EmptyHeader>
<Search size={26}/>
<EmptyTitle>Nenhuma estrutura neste recorte</EmptyTitle>
<EmptyDescription>Ajuste os filtros ou a busca para ampliar sua pesquisa.</EmptyDescription>
</EmptyHeader>{clear&&<Button variant="outline" onClick={clear}>Limpar filtros</Button>}</Empty>;}
function Bars({rows,field,onFilter,limit=5}:{rows:RecordRow[];field:string;onFilter:(key:string,v:string)=>void;limit?:number}){const values=distribution(rows,field).slice(0,limit);const max=values[0]?.count||1;return <div className="distribution-bars">{values.map(x=>
<button key={x.name} onClick={()=>onFilter(field,x.name)} title={'Filtrar '+(x.name===MISSING?'Não informado':x.name)}>
<div>
<span>{x.name===MISSING?'Não informado':x.name}</span>
<strong>{fmt(x.count)} <small>{percent(x.count,rows.length).toFixed(1).replace('.',',')}%</small>
</strong>
</div>
<div className="bar-track">
<i style={{width:100*x.count/max+'%'}}/>
</div>
</button>)}</div>;}
function StatusChart({rows,onFilter}:{rows:RecordRow[];onFilter:(key:string,v:string)=>void}){const values=distribution(rows,'SituacaoOperacionalFormatado');return <>
<div className="status-chart">
<ChartContainer config={{count:{label:'Estruturas',color:'#087fa8'}}} className="donut-container">
<PieChart>
<Pie data={values} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={49} outerRadius={68} paddingAngle={2} stroke="none" isAnimationActive={false}>{values.map(v=>
<Cell key={v.name} fill={STATUS_COLORS[v.name]||'#687b91'}/>)}</Pie>
<Tooltip formatter={(v,n)=>[fmt(Number(v)),shortStatus(String(n))]}/>
</PieChart>
</ChartContainer>
<div className="donut-center">
<strong>{fmt(rows.length)}</strong>
<span>estruturas</span>
</div>
</div>
<div className="status-breakdown">{values.map(v=>
<button key={v.name} onClick={()=>onFilter('SituacaoOperacionalFormatado',v.name)}>
<span>
<i style={{background:STATUS_COLORS[v.name]}}/>{shortStatus(v.name)}</span>
<strong>{fmt(v.count)}<small>{percent(v.count,rows.length).toFixed(1).replace('.',',')}%</small>
</strong>
</button>)}</div>
</>;}

function StructuresTable({rows,selected,toggle,onDetail,onSelectAll,clear}:{rows:RecordRow[];selected:Set<string>;toggle:(id:string)=>void;onDetail:(id:string)=>void;onSelectAll:()=>void;clear:()=>void}){
 const [sorting,setSorting]=useState<SortingState>([{id:'name',desc:false}]);const [pagination,setPagination]=useState({pageIndex:0,pageSize:20});
 useEffect(()=>setPagination(p=>({...p,pageIndex:0})),[rows]);
 const columns=useMemo<ColumnDef<RecordRow>[]>(()=>[
  {id:'select',header:'',enableSorting:false,cell:({row})=>
<Checkbox aria-label={'Selecionar '+row.original.name} checked={selected.has(row.original.id)} onCheckedChange={()=>toggle(row.original.id)}/>},
  {accessorKey:'name',header:'Estrutura',cell:({row})=>
<button className="structure-link" onClick={()=>onDetail(row.original.id)}>
<strong>{row.original.name}</strong>
<span>#{row.original.id}</span>
</button>},
  {accessorKey:'owner',header:'Empreendedor',cell:({row})=>
<div className="owner-cell" title={row.original.owner}>{row.original.owner}<span>{row.original.cnpj?row.original.document:'Documento oculto ou não identificado'}</span>
</div>},
  {id:'location',accessorFn:r=>r.uf+' '+r.city,header:'Localização',cell:({row})=>
<div className="location-cell">{row.original.city}<span>{row.original.uf}</span>
</div>},
  {accessorKey:'status',header:'Situação',cell:({row})=>
<Status value={row.original.status}/>},
  {id:'cri',accessorFn:r=>r.raw.CategoriaRisco,header:'CRI'},
  {id:'dpa',accessorFn:r=>r.raw.DanoPotencial,header:'DPA'},
  {id:'quality',header:'Dados',enableSorting:false,cell:({row})=>row.original.issues.length?<button className="quality-button" title={row.original.issues.map(i=>ISSUE_LABELS[i]).join('; ')} onClick={()=>onDetail(row.original.id)}>
<TriangleAlert size={16}/>
<span>{row.original.issues.length}</span>
</button>:<span className="quiet-check" title="Sem os alertas verificados neste painel">
<Check size={16}/>
</span>}
 ],[selected,toggle,onDetail]);
 const table=useReactTable({data:rows,columns,state:{sorting,pagination},onSortingChange:setSorting,onPaginationChange:setPagination,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),getPaginationRowModel:getPaginationRowModel(),getRowId:r=>r.id});
 if(!rows.length)return <Blank clear={clear}/>;
 const visible=table.getRowModel().rows;const pageAll=visible.length>0&&visible.every(r=>selected.has(r.id)),pageSome=visible.some(r=>selected.has(r.id));
 return <>
<div className="table-toolbar">
<span>{fmt(rows.length)} estruturas no recorte</span>
<button className="text-button" onClick={onSelectAll}>Selecionar todo o recorte</button>
</div>
<Table className="records-table">
<TableHeader>{table.getHeaderGroups().map(g=>
<TableRow key={g.id}>{g.headers.map(h=>
<TableHead key={h.id}>{h.id==='select'?<Checkbox aria-label="Selecionar estruturas desta página" checked={pageAll?true:pageSome?'indeterminate':false} onCheckedChange={()=>visible.forEach(r=>{if(pageAll===selected.has(r.id))toggle(r.id);})}/>:h.column.getCanSort()?<button onClick={h.column.getToggleSortingHandler()}>{flexRender(h.column.columnDef.header,h.getContext())}<ArrowUpDown size={13}/>{h.column.getIsSorted()==='asc'?' ↑':h.column.getIsSorted()==='desc'?' ↓':''}</button>:flexRender(h.column.columnDef.header,h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
<TableBody>{visible.map(r=>
<TableRow key={r.id} data-state={selected.has(r.id)?'selected':undefined}>{r.getVisibleCells().map(c=>
<TableCell key={c.id}>{flexRender(c.column.columnDef.cell,c.getContext())}</TableCell>)}</TableRow>)}</TableBody>
</Table>
<div className="table-footer">
<span>{pagination.pageIndex*pagination.pageSize+1}–{Math.min((pagination.pageIndex+1)*pagination.pageSize,rows.length)} de {fmt(rows.length)}</span>
<div className="page-size">
<span>Por página</span>
<Select value={String(pagination.pageSize)} onValueChange={v=>table.setPageSize(Number(v))}>
<SelectTrigger aria-label="Estruturas por página">
<SelectValue/>
</SelectTrigger>
<SelectContent>{[20,50,100].map(n=>
<SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
</Select>
</div>
<Pagination aria-label="Paginação das estruturas">
<PaginationContent>
<PaginationItem>
<Button variant="outline" size="icon" aria-label="Página anterior" disabled={!table.getCanPreviousPage()} onClick={()=>table.previousPage()}>
<ChevronLeft size={17}/>
</Button>
</PaginationItem>
<PaginationItem>
<span className="page-count">{pagination.pageIndex+1} / {Math.max(1,table.getPageCount())}</span>
</PaginationItem>
<PaginationItem>
<Button variant="outline" size="icon" aria-label="Próxima página" disabled={!table.getCanNextPage()} onClick={()=>table.nextPage()}>
<ChevronRight size={17}/>
</Button>
</PaginationItem>
</PaginationContent>
</Pagination>
</div>
</>;
}

function OwnersTable({rows,onFilter}:{rows:RecordRow[];onFilter:(key:string,v:string)=>void}){const groups=useMemo(()=>groupOwners(rows),[rows]);const [page,setPage]=useState(0);useEffect(()=>setPage(0),[rows]);if(!rows.length)return <Blank/>;return <>
<p className="table-explanation">Agrupamento por CNPJ completo. Quando o documento está oculto, o nome identifica um grupo provisório. Não representa consolidação de grupos econômicos.</p>
<Table className="owners-table">
<TableHeader>
<TableRow>
<TableHead>Empreendedor</TableHead>
<TableHead>Documento</TableHead>
<TableHead>UFs</TableHead>
<TableHead>Estruturas</TableHead>
<TableHead/>
</TableRow>
</TableHeader>
<TableBody>{groups.slice(page*20,(page+1)*20).map(g=>
<TableRow key={g.key}>
<TableCell>
<strong>{g.name}</strong>{g.aliases.length>1&&<span className="cell-meta">{g.aliases.length} variações de nome no cadastro</span>}</TableCell>
<TableCell>{g.cnpj?g.document:<span className="muted">Oculto — agrupado por nome</span>}</TableCell>
<TableCell>{g.ufs.join(', ')}</TableCell>
<TableCell className="numeric">{g.count}</TableCell>
<TableCell>
<Button size="sm" variant="ghost" onClick={()=>onFilter('ownerKey',g.key)}>Explorar <ArrowRight size={14}/>
</Button>
</TableCell>
</TableRow>)}</TableBody>
</Table>
<div className="table-footer">
<span>{groups.length} grupos cadastrais</span>
<Pagination aria-label="Paginação de empreendedores">
<PaginationContent>
<PaginationItem>
<Button variant="outline" size="icon" aria-label="Página anterior" disabled={page===0} onClick={()=>setPage(page-1)}>
<ChevronLeft size={17}/>
</Button>
</PaginationItem>
<PaginationItem>
<span className="page-count">{page+1} / {Math.ceil(groups.length/20)}</span>
</PaginationItem>
<PaginationItem>
<Button variant="outline" size="icon" aria-label="Próxima página" disabled={(page+1)*20>=groups.length} onClick={()=>setPage(page+1)}>
<ChevronRight size={17}/>
</Button>
</PaginationItem>
</PaginationContent>
</Pagination>
</div>
</>;}

function Quality({rows,onFilter}:{rows:RecordRow[];onFilter:(key:string,v:string)=>void}){return <div className="quality-content">
<p>Verificações de preenchimento e formato. Estes alertas não são uma avaliação de segurança das estruturas.</p>
<div className="quality-grid">{Object.entries(ISSUE_LABELS).map(([code,label])=>{const count=rows.filter(r=>r.issues.includes(code)).length;return <button key={code} onClick={()=>onFilter('quality',code)} className="quality-tile">
<span>{label}</span>
<strong>{fmt(count)}</strong>
<small>Ver registros <ArrowRight size={13}/>
</small>
</button>;})}</div>
<div className="quality-notes">
<p>
<strong>Coordenadas:</strong> minutos e segundos devem estar abaixo de 60. Valores inconsistentes são preservados na tabela e não são posicionados por estimativa.</p>
<p>
<strong>Dimensões:</strong> zero não comprova que a estrutura seja pequena. Na base inicial, todos os registros em construção têm altura e volume zerados.</p>
<p>
<strong>Classificações:</strong> “N/A”, “não informado”, “não enviado” e “não atestado” são estados distintos. Um status de envio isolado não comprova atraso ou irregularidade.</p>
<p>
<strong>Descaracterização:</strong> esta exportação reúne projeto, obras e monitoramento em uma só categoria. Esses estágios não podem ser separados com esta coluna.</p>
<p>
<strong>Limites comerciais:</strong> não há campos de porte empresarial, prestadoras, laboratórios, contatos ou volume de ensaios. CRI, DPA e emergência não são um score de propensão de compra.</p>
</div>
</div>;}

function Insights({rows,total,onFilter}:{rows:RecordRow[];total:number;onFilter:(key:string,v:string)=>void}){const ufs=distribution(rows,'UF'),owners=groupOwners(rows),top5=owners.slice(0,5).reduce((n,g)=>n+g.count,0),missing=rows.filter(r=>r.mineral==='Não informado').length;return <section className="insights-section">
<div className="section-heading">
<h2>
<ChartNoAxesCombined size={20}/>Leitura do recorte</h2>
<span>{percent(rows.length,total).toFixed(1).replace('.',',')}% da base</span>
</div>{rows.length?<>
<div className="insight-cards">
<article>
<p>Concentração geográfica</p>
<strong>{ufs[0]?.name} reúne {percent(ufs[0]?.count||0,rows.length).toFixed(1).replace('.',',')}%</strong>
<span>{fmt(ufs[0]?.count||0)} estruturas do recorte. Explore as estruturas e as operações vinculadas antes de definir uma abordagem regional.</span>
</article>
<article>
<p>Concentração cadastral</p>
<strong>{percent(top5,rows.length).toFixed(1).replace('.',',')}% nos 5 maiores grupos</strong>
<span>Participação por quantidade de estruturas. O agrupamento por documento ou nome não indica porte econômico.</span>
</article>
<article>
<p>Informação disponível</p>
<strong>{fmt(rows.length-missing)} com minério informado</strong>
<span>{fmt(missing)} sem essa informação. Esse grupo permanece acessível para evitar exclusões por falta de preenchimento.</span>
</article>
</div>
<div className="analysis-grid">
<article className="panel analysis-panel">
<h3>Minérios mais presentes</h3>
<Bars rows={rows} field="Minerio" onFilter={onFilter} limit={6}/>
</article>
<article className="panel analysis-panel">
<h3>Métodos construtivos</h3>
<Bars rows={rows} field="MetodoConstrutivoFormatado" onFilter={onFilter} limit={6}/>
</article>
</div>
</>:<p className="muted">Ajuste os filtros para ver a leitura de um recorte.</p>}</section>;}

function Detail({row,close,selected,toggle,onFilter}:{row:RecordRow|null;close:()=>void;selected:Set<string>;toggle:(id:string)=>void;onFilter:(key:string,v:string)=>void}){return <Sheet open={!!row} onOpenChange={v=>{if(!v)close();}}>
<SheetContent className="detail-sheet" showCloseButton={false}>{row&&<>
<SheetHeader>
<div className="detail-top">
<span className="eyebrow">ESTRUTURA #{row.id}</span>
<SheetClose asChild>
<Button variant="ghost" size="icon" aria-label="Fechar detalhes">
<X size={18}/>
</Button>
</SheetClose>
</div>
<SheetTitle className="detail-title">{row.name}</SheetTitle>
<SheetDescription>{row.city} / {row.uf}</SheetDescription>
<Status value={row.status}/>
</SheetHeader>
<div className="detail-actions">
<Button onClick={()=>toggle(row.id)} variant={selected.has(row.id)?'outline':'default'}>{selected.has(row.id)?<Check size={16}/>:<ClipboardList size={16}/>} {selected.has(row.id)?'Remover da seleção':'Adicionar à seleção'}</Button>
</div>
<div className="detail-body">
<section>
<h3>Empreendedor</h3>
<p className="detail-owner">{row.owner}</p>
<p className="muted">{row.cnpj?row.document:'Documento oculto ou não identificado'}</p>
<button className="text-button" onClick={()=>{onFilter('ownerKey',row.ownerKey);close();}}>Explorar estruturas deste cadastro <ArrowRight size={14}/>
</button>
</section>{row.issues.length>0&&<section className="detail-warning">
<h3>
<TriangleAlert size={16}/>Pontos a conferir</h3>
<ul>{row.issues.map(code=>
<li key={code}>{ISSUE_LABELS[code]}</li>)}</ul>
</section>}<section>
<h3>Dados do SIGBM</h3>
<dl className="detail-fields">{Object.keys(FIELD_LABELS).filter(k=>k in row.raw&&!['Codigo','NomeBarragem','NomeEmpreendedor','CpfCnpjFormatado'].includes(k)).map(key=>
<div key={key}>
<dt>{FIELD_LABELS[key]}</dt>
<dd>{displayValue(row.raw[key])}</dd>
</div>)}</dl>
</section>
<p className="detail-note">A existência da estrutura não confirma uma obra ou contratação em andamento. Use este contexto para qualificar projeto, executores e demanda de QA/QC.</p>
</div>
</>}</SheetContent>
</Sheet>;}

function ImportDialog({open,setOpen,current,onSaved}:{open:boolean;setOpen:(v:boolean)=>void;current:LoadedDataset;onSaved:(data:LoadedDataset)=>void}){
 const [csv,setCsv]=useState(''),[fileName,setFileName]=useState(''),[date,setDate]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reading,setReading]=useState(false),[preview,setPreview]=useState<Dataset|null>(null);const fileRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(open){setCsv('');setFileName('');setDate('');setError('');setPreview(null);}},[open]);
 const readFile=async(file:File|undefined)=>{if(!file)return;setReading(true);setError('');setPreview(null);setCsv('');try{if(file.size>10*1024*1024)throw new Error('Selecione um arquivo de até 10 MB.');const bytes=await file.arrayBuffer();let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('windows-1252').decode(bytes);}const parsed=parseCSV(text);setCsv(text);setFileName(file.name);setPreview({schemaVersion:1,...parsed,referenceDate:date,fileName:file.name,revision:'preview'});}catch(e){setError(e instanceof Error?e.message:'Não foi possível ler o arquivo.');}finally{setReading(false);}};
 const save=async()=>{setError('');if(!validDate(date)){setError('Informe a data em que a extração foi realizada.');return;}if(!preview)return;setBusy(true);try{const dataset:LoadedDataset={...preview,referenceDate:date,fileName,revision:crypto.randomUUID(),importedAt:new Date().toISOString()};await saveBrowserDataset(dataset);onSaved(dataset);setOpen(false);toast.success('Base atualizada neste navegador. Os filtros e a seleção foram reiniciados.');}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a base neste navegador.');}finally{setBusy(false);}};
 const summary=preview?statistics(prepareRows(preview)):null;
 return <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}>
<DialogContent className="import-dialog" showCloseButton={false}>
<DialogHeader>
<div className="detail-top">
<span className="eyebrow">ATUALIZAÇÃO DA BASE</span>
<Button variant="ghost" size="icon" aria-label="Fechar atualização" onClick={()=>setOpen(false)} disabled={busy}>
<X size={18}/>
</Button>
</div>
<DialogTitle>Carregar uma nova extração</DialogTitle>
<DialogDescription>Confira o CSV e informe sua data de referência antes de atualizar o painel.</DialogDescription>
</DialogHeader>
<div className="upload-area">
<Upload size={26}/>
<strong>{fileName||'Exportação CSV do SIGBM'}</strong>
<span>Mesmo conjunto de colunas da base atual · até 10 MB</span>
<input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e=>readFile(e.target.files?.[0])} className="sr-only" aria-label="Escolher CSV do SIGBM"/>
<Button variant="outline" disabled={busy||reading} onClick={()=>fileRef.current?.click()}>{reading?'Lendo arquivo…':'Escolher arquivo'}</Button>
</div>
<div className="filter-field">
<label htmlFor="import-date">Data da extração</label>
<Input id="import-date" type="date" value={date} onChange={e=>setDate(e.target.value)} disabled={busy}/>
</div>{summary&&<div className="import-summary">
<div>
<strong>{fmt(summary.total)}</strong>
<span>estruturas</span>
</div>
<div>
<strong>{summary.states}</strong>
<span>estados</span>
</div>
<div>
<strong>{fmt(summary.total-summary.mapped)}</strong>
<span>coordenadas a revisar</span>
</div>
<p>{summary.total-current.rows.length>=0?'+':''}{summary.total-current.rows.length} registros em relação à base atual. A comparação é de quantidade, não de projetos novos.</p>
</div>}{error&&<p role="alert" className="error-message">{error}</p>}<p className="muted small">A nova base fica armazenada somente neste navegador. Ela não é enviada para um servidor nem altera os dados do repositório.</p>
<DialogFooter>
<Button variant="outline" onClick={()=>setOpen(false)} disabled={busy}>Cancelar</Button>
<Button disabled={!preview||busy||reading||!date} onClick={save}>{busy?'Salvando…':'Aplicar nova base'}</Button>
</DialogFooter>
</DialogContent>
</Dialog>;
}

function PrintReport({dataset,rows,filters,owners}:{dataset:Dataset;rows:RecordRow[];filters:Filters;owners:OwnerGroup[]}){const stats=statistics(rows);return <section className="print-report">
<p>SIGBM MARKET INTELLIGENCE · RAFAEL PROVEZANO</p>
<h1>Recorte do SIGBM</h1>
<p>Referência: {formatDate(dataset.referenceDate)} · Arquivo: {dataset.fileName}</p>
<p>
<strong>Critérios:</strong> {filterDescription(filters,owners)}</p>
<div className="print-kpis">
<span>{fmt(stats.total)} estruturas</span>
<span>{fmt(stats.cnpjs)} CNPJs identificados</span>
<span>{stats.states} estados</span>
<span>{stats.municipalities} municípios</span>
</div>{['SituacaoOperacionalFormatado','UF','Minerio','MetodoConstrutivoFormatado'].map(field=>
<section key={field}>
<h2>{FIELD_LABELS[field]}</h2>
<table>
<thead>
<tr>
<th>Categoria</th>
<th>Estruturas</th>
<th>Participação no recorte</th>
</tr>
</thead>
<tbody>{distribution(rows,field).map(x=>
<tr key={x.name}>
<td>{x.name===MISSING?'Não informado':x.name}</td>
<td>{fmt(x.count)}</td>
<td>{percent(x.count,rows.length).toFixed(1).replace('.',',')}%</td>
</tr>)}</tbody>
</table>
</section>)}<h2>Dados e interpretação</h2>
<p>{stats.total-stats.mapped} registros com coordenadas a revisar e {stats.unidentified} com documento não identificado. Registros sem dados permanecem no recorte conforme os filtros escolhidos. A base não identifica contratos, prestadoras ou demanda de QA/QC. Fonte: ANM / SIGBM. Indicadores representam o arquivo de referência.</p>
</section>;}

export default function Dashboard(){
 const [data,setData]=useState<LoadedDataset|null>(null),[loading,setLoading]=useState(true),[filters,setFiltersState]=useState<Filters>({...EMPTY_FILTERS,categories:{}}),[selected,setSelected]=useState<Set<string>>(new Set()),[detailId,setDetailId]=useState<string|null>(null),[tab,setTab]=useState('structures'),[importOpen,setImportOpen]=useState(false),[mobileOpen,setMobileOpen]=useState(false),[selectionOnly,setSelectionOnly]=useState(false);
 const load=useCallback(async()=>{setLoading(true);const value=await loadBrowserDataset(initialDataset as Dataset);setData(value);setSelected(new Set());setFiltersState({...EMPTY_FILTERS,categories:{}});setSelectionOnly(false);setLoading(false);},[]);
 useEffect(()=>{load();},[load]);
 const rows=useMemo(()=>data?prepareRows(data):[],[data]);const owners=useMemo(()=>groupOwners(rows),[rows]);const filtered=useMemo(()=>filterRows(rows,filters),[rows,filters]);const stats=useMemo(()=>statistics(filtered),[filtered]);const totalStats=useMemo(()=>statistics(rows),[rows]);
 const toggle=useCallback((id:string)=>setSelected(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;}),[]);
 const onDetail=useCallback((id:string)=>setDetailId(id),[]);
 const onFilter=useCallback((key:string,v:string)=>{setFiltersState(f=>({...f,categories:{...f.categories,[key]:[v],...(key==='UF'?{Municipio:[]}:{} )}}));setSelectionOnly(false);setTab('structures');},[]);
 const setFilters=(f:Filters)=>{setFiltersState(f);setSelectionOnly(false);};
 const clear=()=>{setFiltersState({...EMPTY_FILTERS,categories:{}});setSelectionOnly(false);};
 const selectedRows=useMemo(()=>rows.filter(r=>selected.has(r.id)),[rows,selected]);
 const tableRows=selectionOnly?selectedRows:filtered;const selectedInFilter=filtered.filter(r=>selected.has(r.id)).length;
 const activeCount=Object.values(filters.categories).filter(v=>v.length).length+(filters.query?1:0)+((filters.heightMin||filters.heightMax)?1:0)+((filters.volumeMin||filters.volumeMax)?1:0);
 const exported=(mode:'filtered'|'selected'|'owners')=>{if(!data)return;const targets=mode==='selected'?selectedRows:filtered;if(!targets.length)return;const context=mode==='selected'?'Seleção manual de estruturas; pode conter registros fora do recorte atual.':filterDescription(filters,owners);const content=mode==='owners'?ownerExport(targets,data,context):structureExport(targets,data,context);const blob=new Blob([content],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`sigbm-market-intelligence-${mode==='owners'?'empreendedores':mode==='selected'?'selecao':'recorte'}-${data.referenceDate}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast.success(mode==='owners'?'Lista de empreendedores exportada.':`${fmt(targets.length)} estruturas exportadas.`);};
 if(loading&&!data)return <main className="loading-screen">
<Layers3 size={34}/>
<h1>SIGBM Intelligence</h1>
<p>Carregando a inteligência de mercado…</p>
</main>;
 if(!data)return null;
 return <>
<div className="app-workspace">
<header className="topbar">
<a href="./" className="brand">
<span className="brand-icon">
<Layers3 size={26}/>
</span>
<span>
<strong>SIGBM INTELLIGENCE</strong>
<small>Projeto de Rafael Provezano</small>
</span>
</a>
<div className="topbar-context">
<span>SIGBM</span>
<span>Brasil</span>
</div>
<div className="topbar-actions">
<Button variant="outline" onClick={()=>setImportOpen(true)}>
<Upload size={16}/>
<span>Atualizar base</span>
</Button>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button>
<Download size={16}/>
<span>Exportar</span>
<ChevronDown size={14}/>
</Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="export-menu">
<DropdownMenuLabel>Listas para qualificação</DropdownMenuLabel>
<DropdownMenuLabel className="export-subtitle">CSV compatível com Excel · Referência: {formatDate(data.referenceDate)}</DropdownMenuLabel>
<DropdownMenuItem disabled={!filtered.length} onSelect={()=>exported('filtered')}>Estruturas do recorte ({fmt(filtered.length)})</DropdownMenuItem>
<DropdownMenuItem disabled={!selectedRows.length} onSelect={()=>exported('selected')}>Estruturas selecionadas ({fmt(selectedRows.length)})</DropdownMenuItem>
<DropdownMenuItem disabled={!filtered.length} onSelect={()=>exported('owners')}>Empreendedores do recorte</DropdownMenuItem>
<DropdownMenuSeparator/>
<DropdownMenuItem onSelect={()=>window.print()}>
<FileText size={15}/>Imprimir resumo do recorte</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
</div>
</header>
<div className="workspace-grid">
<aside className="desktop-filters">
<FiltersPanel rows={rows} filters={filters} setFilters={setFilters} owners={owners}/>
</aside>
<main className="main-content">
<div className="page-heading">
<div>
<p className="eyebrow">EXPLORAÇÃO DO MERCADO</p>
<h1>{activeCount?'Seu recorte do SIGBM':'Panorama nacional'}</h1>
<p>Estruturas de mineração para orientar a qualificação comercial.</p>
</div>
<div className="source-tag">
<span className="source-label">BASE DE REFERÊNCIA</span>
<strong>{formatDate(data.referenceDate)}</strong>
<span title={data.fileName}>{data.fileName}</span>
</div>
</div>
<div className="search-row">
<div className="search-input">
<Search size={18}/>
<Input value={filters.query} onChange={e=>setFilters({...filters,query:e.target.value})} aria-label="Buscar estrutura, empreendedor, CNPJ ou município" placeholder="Buscar estrutura, empreendedor, CNPJ ou município…"/>{filters.query&&<button aria-label="Limpar busca" onClick={()=>setFilters({...filters,query:''})}>
<X size={17}/>
</button>}</div>
<Button className="mobile-filter-button" variant="outline" onClick={()=>setMobileOpen(true)}>
<SlidersHorizontal size={17}/>Filtros{activeCount>0?` (${activeCount})`:''}</Button>{activeCount>0&&<Button variant="ghost" className="reset-button" onClick={clear}>
<RotateCcw size={15}/>Limpar recorte</Button>}</div>{activeCount>0&&<div className="active-filters" aria-live="polite">{Object.entries(filters.categories).flatMap(([key,vs])=>vs.map(v=>
<button key={key+v} title={'Remover filtro '+optionLabel(key,v,owners)} onClick={()=>setFilters({...filters,categories:{...filters.categories,[key]:vs.filter(x=>x!==v)}})}>
<span>{FIELD_LABELS[key]}: {optionLabel(key,v,owners)}</span>
<X size={13}/>
</button>))}{(filters.heightMin||filters.heightMax)&&<button onClick={()=>setFilters({...filters,heightMin:'',heightMax:''})}>Altura: {filters.heightMin||'0'} a {filters.heightMax||'sem máximo'} m<X size={13}/>
</button>}{(filters.volumeMin||filters.volumeMax)&&<button onClick={()=>setFilters({...filters,volumeMin:'',volumeMax:''})}>Volume: {filters.volumeMin||'0'} a {filters.volumeMax||'sem máximo'} milhões m³<X size={13}/>
</button>}</div>}<section className="kpi-grid" aria-label="Indicadores do recorte">
<article className="kpi">
<span className="kpi-label">Estruturas no recorte<Layers3 size={18}/>
</span>
<strong>{fmt(stats.total)}</strong>
<span>{percent(stats.total,rows.length).toFixed(1).replace('.',',')}% de {fmt(rows.length)} na base</span>
</article>
<article className="kpi">
<span className="kpi-label">CNPJs identificados<Building2 size={18}/>
</span>
<strong>{fmt(stats.cnpjs)}</strong>
<span>{fmt(stats.unidentified)} registros sem documento identificado</span>
</article>
<article className="kpi">
<span className="kpi-label">Presença geográfica<MapPinned size={18}/>
</span>
<strong>{stats.states}<small> estados</small>
</strong>
<span>{stats.municipalities} municípios no recorte</span>
</article>
<article className="kpi">
<span className="kpi-label">Estruturas no mapa<MapPin size={18}/>
</span>
<strong>{fmt(stats.mapped)}</strong>
<span>{stats.total-stats.mapped>0?`${stats.total-stats.mapped} coordenadas a revisar`:'Coordenadas com formato válido'}</span>
</article>
</section>
<div className="map-and-profile">
<StructureMap rows={filtered} onSelect={onDetail} onState={uf=>onFilter('UF',uf)}/>
<aside className="profile-card panel">
<div className="panel-heading">
<div>
<h2>Perfil do recorte</h2>
<p>Situação operacional</p>
</div>
</div>{filtered.length?<StatusChart rows={filtered} onFilter={onFilter}/>:<p className="profile-empty">Sem dados para os filtros escolhidos.</p>}<div className="profile-divider"/>
<div className="profile-states">
<h3>Estados com mais estruturas</h3>
<Bars rows={filtered} field="UF" onFilter={onFilter} limit={4}/>
</div>
</aside>
</div>
<section className="results-panel panel">
<Tabs value={tab} onValueChange={setTab}>
<div className="results-heading">
<TabsList variant="line">
<TabsTrigger value="structures">Estruturas</TabsTrigger>
<TabsTrigger value="owners">Empreendedores</TabsTrigger>
<TabsTrigger value="quality">Qualidade da base</TabsTrigger>
</TabsList>
<div className="selection-counter">
<ClipboardList size={16}/>{fmt(selected.size)} selecionadas</div>
</div>{selected.size>0&&<div className="selection-bar">
<span>
<strong>{fmt(selected.size)}</strong> estruturas selecionadas{selected.size-selectedInFilter>0?` · ${selected.size-selectedInFilter} fora do recorte atual`:''}</span>
<div>
<button onClick={()=>{setSelectionOnly(!selectionOnly);setTab('structures');}}>{selectionOnly?'Voltar ao recorte':'Ver seleção'}</button>
<button onClick={()=>exported('selected')}>Exportar seleção</button>
<button onClick={()=>{setSelected(new Set());setSelectionOnly(false);}}>Limpar</button>
</div>
</div>}{selectionOnly&&tab==='structures'&&<div className="selection-mode">
<Info size={16}/>A tabela exibe a seleção manual completa. O mapa e os indicadores continuam representando os filtros atuais.</div>}<TabsContent value="structures">
<StructuresTable rows={tableRows} selected={selected} toggle={toggle} onDetail={onDetail} clear={clear} onSelectAll={()=>{setSelected(prev=>new Set([...prev,...tableRows.map(r=>r.id)]));toast.success('Estruturas adicionadas à seleção.');}}/>
</TabsContent>
<TabsContent value="owners">
<OwnersTable rows={filtered} onFilter={onFilter}/>
</TabsContent>
<TabsContent value="quality">
<Quality rows={filtered} onFilter={onFilter}/>
</TabsContent>
</Tabs>
</section>
<Insights rows={filtered} total={rows.length} onFilter={onFilter}/>
<footer className="page-footer">
<p>Projeto independente de <a href="https://github.com/Provezanovsky" target="_blank" rel="noreferrer">Rafael Provezano</a> · Fonte: <a href="https://sigbm.anm.gov.br/publico" target="_blank" rel="noreferrer">ANM / SIGBM</a> · Extração de {formatDate(data.referenceDate)} · {fmt(totalStats.total)} registros</p>
<p>Aplicação não oficial. As classificações técnicas não indicam propensão de compra nem substituem avaliação especializada.</p>
</footer>
</main>
</div>
</div>
<Detail row={rows.find(r=>r.id===detailId)||null} close={()=>setDetailId(null)} selected={selected} toggle={toggle} onFilter={onFilter}/>
<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
<SheetContent side="left" className="mobile-filters-sheet" showCloseButton={false}>
<SheetHeader>
<SheetTitle className="sr-only">Filtros do SIGBM</SheetTitle>
<SheetDescription className="sr-only">Combine propriedades para explorar o mercado.</SheetDescription>
<SheetClose asChild>
<Button variant="outline">Ver {fmt(filtered.length)} estruturas <X size={15}/>
</Button>
</SheetClose>
</SheetHeader>
<FiltersPanel rows={rows} filters={filters} setFilters={setFilters} owners={owners}/>
</SheetContent>
</Sheet>
<ImportDialog open={importOpen} setOpen={setImportOpen} current={data} onSaved={d=>{setData(d);clear();setSelected(new Set());setDetailId(null);}}/>
<PrintReport dataset={data} rows={filtered} filters={filters} owners={owners}/>
<Toaster richColors position="bottom-right"/>
</>;
}
