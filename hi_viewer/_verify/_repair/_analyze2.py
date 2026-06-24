import json, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
im=Image.open('images/upper_p184_right.jpg').convert('L')
A=np.asarray(im).astype(np.int16)
H,W=A.shape
ann=json.load(open('data/annotations/kumamoto_demographics.json',encoding='utf-8'))
thr=110
BW=104  # target box width

def analyze(x,y,w,h):
    cx=x+w//2
    # search center within +-40 of current center
    sy0=max(0,y-40); sy1=min(H,y+h+40)
    best=None
    for c in range(cx-45,cx+46,2):
        xa=max(0,c-BW//2); xb=min(W,c+BW//2)
        sub=A[sy0:sy1, xa:xb]
        ink=(sub<thr).sum()
        if best is None or ink>best[0]:
            best=(ink,c)
    c=best[1]
    xa=c-BW//2; xb=c+BW//2
    # now row profile within this column to find top/bottom of ink
    rows=(A[sy0:sy1, xa:xb]<thr).sum(axis=1)
    nz=np.where(rows>3)[0]
    if len(nz):
        ytop=sy0+nz.min(); ybot=sy0+nz.max()
    else:
        ytop=y; ybot=y+h
    return xa, ytop, BW, ybot-ytop, c

for a in ann:
    ident=[b['value'] for b in a['body'] if b['purpose']=='identifying'][0]
    x,y,w,h=[int(v) for v in a['target']['selector']['value'].split('pixel:')[1].split(',')]
    idx=a['id'][-2:]
    nx,ny,nw,nh,c=analyze(x,y,w,h)
    print(idx, ident.encode('unicode_escape').decode(),
          '| cur',x,y,w,h,'-> top%d bot%d'%(y,y+h),
          '| NEW x%d y%d w%d h%d top%d bot%d cx%d'%(nx,ny,nw,nh,ny,ny+nh,c))
