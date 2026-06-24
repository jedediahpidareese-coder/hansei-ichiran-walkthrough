import json, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
im=Image.open('images/upper_p184_right.jpg').convert('L')
A=np.asarray(im).astype(np.int16)
H,W=A.shape
ann=json.load(open('data/annotations/kumamoto_demographics.json',encoding='utf-8'))
thr=120
BW=108

# label bottoms differ per column; search downward to a global limit
def analyze(x,y,w,h, ydown_limit):
    cx=x+w//2
    sy0=max(0,y-50); sy1=min(H,y+h+60)
    best=None
    for c in range(cx-50,cx+51,1):
        xa=max(0,c-BW//2); xb=min(W,c+BW//2)
        sub=A[sy0:sy1, xa:xb]
        ink=(sub<thr).sum()
        if best is None or ink>best[0]:
            best=(ink,c)
    c=best[1]; xa=c-BW//2; xb=c+BW//2
    # full vertical scan from y-60 down to ydown_limit
    yA=max(0,y-80); yB=min(H,ydown_limit)
    rows=(A[yA:yB, xa:xb]<thr).sum(axis=1)
    nz=np.where(rows>2)[0]
    ytop=yA+nz.min(); ybot=yA+nz.max()
    return xa, ytop, BW, ybot-ytop, c, ytop, ybot

for a in ann:
    ident=[b['value'] for b in a['body'] if b['purpose']=='identifying'][0]
    x,y,w,h=[int(v) for v in a['target']['selector']['value'].split('pixel:')[1].split(',')]
    idx=a['id'][-2:]
    nx,ny,nw,nh,c,yt,yb=analyze(x,y,w,h, y+h+120)
    print(idx, ident.encode('unicode_escape').decode(),
          '| NEW x%d y%d w%d h%d  top%d bot%d cx%d'%(nx,ny,nw,nh,yt,yb,c))
