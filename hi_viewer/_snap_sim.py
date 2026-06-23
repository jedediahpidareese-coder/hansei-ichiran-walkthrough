# -*- coding: utf-8 -*-
import json, glob, os, io
import numpy as np
from PIL import Image

THRESH=120; MIN_INK_ABS=5; INK_FRAC=0.05
GAP=120; GAP_COMPOSITE=200; PAD=12
UP_NORMAL=70; DOWN_NORMAL=650; UP_MF=30; DOWN_MF=320
GUTTER_DARK_FRAC=0.92; GUTTER_MIN_RUN=40
MF_CAP_OFFSET=-6

COMP_TOKENS=['内僧','非人乞丐','権少参事','少参事','此八分出','八分出','此人員','藩制一覧表']

def is_mf(ident):
    return ('男' in ident) or ('女' in ident) or ('尼' in ident)

def is_composite(ident,w):
    if w>=300: return True
    for t in COMP_TOKENS:
        if t in ident: return True
    return False

def load_boxes(fn):
    d=json.load(open(fn,encoding='utf-8'))
    boxes=[]
    for a in d:
        ident=''
        for b in a['body']:
            if b['purpose']=='identifying': ident=b['value']
        sel=a['target']['selector']['value'].replace('xywh=pixel:','')
        x,y,w,h=[int(v) for v in sel.split(',')]
        boxes.append(dict(id=a['id'],ident=ident,x=x,y=y,w=w,h=h,src=a['target']['source'].replace('images/','')))
    return boxes

_imgcache={}
def gray(src):
    if src not in _imgcache:
        _imgcache[src]=np.asarray(Image.open('images/'+src).convert('L'))
    return _imgcache[src]

def snap(box, allboxes):
    G=gray(box['src'])
    H,W=G.shape
    x,y,w,h=box['x'],box['y'],box['w'],box['h']
    ident=box['ident']
    x0=max(0,x); x1=min(W,x+w)
    if x1<=x0: return None
    mf=is_mf(ident); comp=is_composite(ident,w)
    if mf: up,down,gap=UP_MF,DOWN_MF,GAP
    elif comp: up,down,gap=UP_NORMAL,DOWN_NORMAL,GAP_COMPOSITE
    else: up,down,gap=UP_NORMAL,DOWN_NORMAL,GAP
    ys=max(0,y-up); ye=min(H,y+h+down)
    strip=G[ys:ye, x0:x1]
    dark=(strip<THRESH)
    rowcount=dark.sum(axis=1)
    rowfrac=dark.mean(axis=1)
    minink=max(MIN_INK_ABS, INK_FRAC*w)
    inky=rowcount>minink
    # gutter detect
    gutter=np.zeros_like(inky)
    g=rowfrac>=GUTTER_DARK_FRAC
    i=0; n=len(g)
    while i<n:
        if g[i]:
            j=i
            while j<n and g[j]: j+=1
            if (j-i)>=GUTTER_MIN_RUN: gutter[i:j]=True
            i=j
        else: i+=1
    eff=inky & (~gutter)
    if not eff.any():
        return dict(unchanged=True, reason='no-ink')
    # build runs, bridge gaps<=gap into clusters
    idx=np.where(eff)[0]
    clusters=[]
    cs=idx[0]; ce=idx[0]
    for k in idx[1:]:
        if k-ce<=gap: ce=k
        else:
            clusters.append((cs,ce)); cs=k; ce=k
    clusters.append((cs,ce))
    # anchor on authored top: cluster nearest authored top (in strip coords)
    top_auth=y-ys
    best=min(clusters, key=lambda c: abs(c[0]-top_auth))
    top=best[0]+ys; bot=best[1]+ys
    # data-driven down-cap for non-MF
    cap=ye
    if not mf:
        for ob in allboxes:
            if ob is box: continue
            if not is_mf(ob['ident']): continue
            if ob['src']!=box['src']: continue
            # overlapping x
            ox0=max(x0,ob['x']); ox1=min(x1,ob['x']+ob['w'])
            if ox1<=ox0: continue
            my=ob['y']
            if my>y+40:
                cap=min(cap, my-6)
    bot=min(bot, cap)
    new_y=max(0, top-PAD)
    new_h=(bot-top)+2*PAD
    if new_y+new_h>H: new_h=H-new_y
    if new_h<8: return dict(unchanged=True, reason='degenerate')
    return dict(unchanged=False, new_y=int(new_y), new_h=int(new_h), top=int(top), bot=int(bot),
                cap=int(cap), nclusters=len(clusters))

# Run on the suspect set
targets={
 'data/annotations/saga_military.json':['○佐倉藩','少参事以下書ナラス'],
 'data/annotations/satsuma_military.json':['○鹿兒島藩（書ナラス）','○高知藩','金澤藩データ（前藩）'],
 'data/annotations/tosa_military.json':['○高知藩','権少参事'],
 'data/annotations/nagoya_demographics.json':['内僧','尼','僧 女','非人乞丐 軒','神社'],
 'data/annotations/kanazawa_military.json':['少参事','権少参事','藩制一覧表第八'],
 'data/annotations/kanazawa_kokudaka.json':['○鹿兒島藩'],
 'data/annotations/satsuma_kokudaka.json':['○鹿兒島藩'],
 'data/annotations/kumamoto_kokudaka.json':['○熊本藩'],
 'data/annotations/kumamoto_military.json':['○久留米藩','船艦'],
 'data/annotations/saga_demographics.json':['産物'],
 'data/annotations/tosa_kokudaka.json':['諸産物'],
 'data/annotations/nagoya_kokudaka.json':['○名古屋藩','此八分出','藩制一覧表第四','八分出 釋'],
 'data/annotations/choshu_kokudaka.json':['○山口藩'],
 'data/annotations/satsuma_demographics.json':['○高知藩','附録','人口'],
}
out=io.open('_snap_results.txt','w',encoding='utf-8')
for fn,idents in targets.items():
    if not os.path.exists(fn): 
        out.write('MISSING '+fn+'\n'); continue
    boxes=load_boxes(fn)
    out.write('=== '+os.path.basename(fn)+' ('+boxes[0]['src']+') ===\n')
    for tb in boxes:
        if tb['ident'] not in idents: continue
        r=snap(tb,boxes)
        ay,ah=tb['y'],tb['h']
        if r is None:
            out.write(f"  [{tb['ident']}] x={tb['x']} -> SKIP(no x)\n"); continue
        if r.get('unchanged'):
            out.write(f"  [{tb['ident']}] authored y={ay} h={ah} -> UNCHANGED ({r['reason']})\n")
        else:
            dy=r['new_y']-ay; dh=r['new_h']-ah
            pct=100.0*abs(r['new_h']-ah)/ah
            out.write(f"  [{tb['ident']}] authored y={ay} h={ah} -> snap y={r['new_y']} h={r['new_h']} (dy={dy:+d} dh={dh:+d}, |dh|={pct:.0f}%, clusters={r['nclusters']}, cap={r['cap']})\n")
out.close()
print('done')
