import json,sys,re,numpy as np
from PIL import Image
out=sys.argv[1];rep=json.load(open(out+'/rep.json'));bad=0
def lum(c):
    c=np.asarray(c,float)/255;c=np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4);return .2126*c[...,0]+.7152*c[...,1]+.0722*c[...,2]
for st in rep:
    im=np.asarray(Image.open(f"{out}/bg-{st['slide']}-{st['step']}.png").convert('RGB'))
    for it in st['items']:
        x,y,w,h=[int(round(v)) for v in (it['x'],it['y'],it['w'],it['h'])]
        if x<-2 or y<-2 or x+w>1922 or y+h>1082: print('OUT',st['slide'],st['step'],it['t'],x,y,w,h);bad+=1;continue
        if w<2 or h<2: continue
        reg=im[max(y,0):y+h,max(x,0):x+w].reshape(-1,3)
        v=[float(a) for a in re.findall(r'[\d.]+',it['c'])];fg=lum(v[:3])
        L=lum(reg);lo,hi=np.percentile(L,5),np.percentile(L,95)
        cr=min((max(fg,b)+.05)/(min(fg,b)+.05) for b in (lo,hi))
        big=float(it['fs'][:-2])>=24
        if cr<(3 if big else 4.5): print('CONTRAST %.2f'%cr,st['slide'],st['step'],it['t'],it['fs']);bad+=1
print('issues',bad)
