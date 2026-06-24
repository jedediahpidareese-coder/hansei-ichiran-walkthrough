import sys, json
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS=None
im=Image.open('images/upper_p184_right.jpg').convert('RGB')
W,H=im.size

def crop(name, x,y,w,h, pad_side=45, pad_top=250, pad_bot=80, scale=2.4):
    x0=max(0,x-pad_side); y0=max(0,y-pad_top)
    x1=min(W,x+w+pad_side); y1=min(H,y+h+pad_bot)
    c=im.crop((x0,y0,x1,y1)).copy()
    d=ImageDraw.Draw(c)
    # current rect in red (offset to crop coords)
    d.rectangle([x-x0,y-y0,x+w-x0,y+h-y0],outline=(255,0,0),width=3)
    # gridlines every 20px abs y
    yy=(y0//20+1)*20
    while yy<y1:
        gy=yy-y0
        col=(0,160,255) if yy%100==0 else (0,220,255)
        d.line([0,gy,c.width,gy],fill=col,width=1 if yy%100 else 2)
        if yy%100==0:
            d.text((2,gy+1),str(yy),fill=(0,80,255))
        yy+=20
    # vertical x-gridlines every 50px, label every 100
    xx=(x0//50+1)*50
    while xx<x1:
        gx=xx-x0
        col=(255,120,0) if xx%100==0 else (255,200,120)
        d.line([gx,0,gx,c.height],fill=col,width=1)
        if xx%100==0:
            d.text((gx+1,2),str(xx),fill=(200,60,0))
        xx+=50
    c=c.resize((int(c.width*scale),int(c.height*scale)))
    p='_verify/_repair/_z_%s.png'%name
    c.save(p)
    print('saved',p,'absx',x0,x1,'absy',y0,y1)

if __name__=='__main__':
    args=sys.argv[1:]
    name=args[0]; x,y,w,h=[int(v) for v in args[1:5]]
    kw={}
    for a in args[5:]:
        k,v=a.split('='); kw[k]=float(v) if k=='scale' else int(v)
    crop(name,x,y,w,h,**kw)
