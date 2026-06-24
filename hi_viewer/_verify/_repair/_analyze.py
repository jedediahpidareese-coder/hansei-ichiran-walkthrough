import json, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
im=Image.open('images/upper_p184_right.jpg').convert('L')
A=np.asarray(im).astype(np.int16)
H,W=A.shape
ann=json.load(open('data/annotations/kumamoto_demographics.json',encoding='utf-8'))

def ink_cols(x0,x1,y0,y1,thr=110):
    sub=A[y0:y1, x0:x1]
    colink=(sub<thr).sum(axis=0)
    return colink

def ink_rows(x0,x1,y0,y1,thr=110):
    sub=A[y0:y1, x0:x1]
    rowink=(sub<thr).sum(axis=1)
    return rowink

for a in ann:
    ident=[b['value'] for b in a['body'] if b['purpose']=='identifying'][0]
    x,y,w,h=[int(v) for v in a['target']['selector']['value'].split('pixel:')[1].split(',')]
    idx=a['id'][-2:]
    # search a generous window around current box for ink
    sx0=max(0,x-60); sx1=min(W,x+w+60)
    sy0=max(0,y-120); sy1=min(H,y+h+120)
    # column ink profile -> find dense ink columns
    colink=ink_cols(sx0,sx1,sy0,sy1)
    # find x range where colink > 8% of height
    hcol=sy1-sy0
    mask=colink>(0.05*hcol)
    xs=np.where(mask)[0]
    if len(xs):
        ink_x0=sx0+xs.min(); ink_x1=sx0+xs.max()
    else:
        ink_x0=x; ink_x1=x+w
    print(idx, ident.encode('unicode_escape').decode(),
          'cur x',x,x+w,'| inkx',ink_x0,ink_x1,'w',ink_x1-ink_x0)
