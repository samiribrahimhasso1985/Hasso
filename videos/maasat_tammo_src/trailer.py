import numpy as np, subprocess, sys, wave
from PIL import Image, ImageFilter, ImageDraw, ImageFont
W,H,FPS=1920,1080,25
N=248; DUR=N/FPS                         # 9.92 s, safely under 10 s
WW,WH=2880,1620                          # world canvas (camera crops into it)
OUT=sys.argv[1]; AUD='score.wav'

def noise1d(n,octv,seed):
    r=np.random.default_rng(seed); o=np.zeros(n)
    for k in range(octv):
        m=3*2**k; p=r.uniform(-1,1,m+2)
        o+=np.interp(np.linspace(0,m,n),np.arange(m+2),p)/(1.8**k)
    return o
def noise2d(h,w,sc,seed):
    s=np.random.default_rng(seed).uniform(0,1,(max(2,h//sc),max(2,w//sc)))
    return np.asarray(Image.fromarray((s*255).astype(np.uint8)).resize((w,h),Image.BICUBIC))/255.
def blur(a,r): return np.asarray(Image.fromarray((a.clip(0,1)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)))/255.

# ---------- world: Sinjar ridge at dawn ----------
y=np.arange(WH)[:,None].astype(float); x=np.arange(WW)[None,:].astype(float)
HOR=1080
SUNX,SUNY=900,820
sky=0.50+0.42*(y/HOR)**1.6
glow=np.exp(-(((x-SUNX)/700)**2+((y-SUNY)/330)**2))
sky=sky+0.25*glow+0.03*(noise2d(WH,WW,140,1)-.5)
xs=np.arange(WW)
# Jabal Sinjar: one long ridge, flattish crest, gentle peaks
ridge=HOR-330-90*noise1d(WW,7,3)-80*np.exp(-((xs-1700)/650)**2)-40*np.exp(-((xs-600)/400)**2)
def aniso(h,w,sy,sx,seed):
    a=np.random.default_rng(seed).uniform(0,1,(max(2,h//sy),max(2,w//sx)))
    return np.asarray(Image.fromarray((a*255).astype(np.uint8)).resize((w,h),Image.BICUBIC))/255.
# ravines running down the ridge flank + rock texture
gul=0.30*aniso(WH,WW,22,7,4)+0.40*noise2d(WH,WW,14,5)+0.30*noise2d(WH,WW,3,6)
far=0.47+0.10*((y-ridge)/330).clip(0,1)-0.24*(gul-.5)
far=far+0.10*glow                                   # atmospheric haze toward the sun
fh=HOR-110-45*noise1d(WW,6,9)
foot=0.36-0.12*(noise2d(WH,WW,10,10)-.5)-0.05*(noise2d(WH,WW,3,16)-.5)+0.05*glow
ground=0.42-0.18*((y-HOR)/(WH-HOR)).clip(0,1)+0.09*(noise2d(WH,WW,4,11)-.5)+0.07*(noise2d(WH,WW,40,12)-.5)
rc=1330+10*noise1d(WW,3,13)
road=blur((np.abs(y-rc[None,:])<70).astype(float),14)
ground=ground*(1-road)+(0.55+0.06*(noise2d(WH,WW,3,14)-.5))*road
for off in(-30,28): ground-=0.06*np.exp(-((y-rc[None,:]-off)/5)**2)
ground[(noise2d(WH,WW,2,15)>0.94)&(y>HOR+30)]-=0.12
L=sky.copy()
m=y>=ridge[None,:]; L[m]=far[m]
m=y>=fh[None,:];    L[m]=foot[m]
gm=blur((y>=HOR).repeat(WW,1).astype(float),4)
L=L*(1-gm)+ground*gm+0.10*np.exp(-((y-HOR)/40)**2)
L=blur(L,1.0)
warm=np.clip(glow*1.3,0,1)                           # how much dawn warmth each pixel gets

def grade(l,w=0.0):
    l=np.clip(l,0,1)[...,None]
    sh=np.array([.06,.05,.05]); md=np.array([.50,.39,.29]); hi=np.array([.98,.87,.70])
    c=np.where(l<.5, sh+(md-sh)*(l/.5), md+(hi-md)*((l-.5)/.5))
    if np.ndim(w): w=w[...,None]
    return c*(1-0.25*w)+np.array([1.0,.72,.45])*l*0.25*w*1.6
world=np.clip(grade(L,warm),0,1)

# ---------- the four ages of Tammo ----------
srcs=['front0.png','front1.png','front2.png','side3.png']
hts=[205,240,280,272]                                 # world-pixel heights
FX,FY=1560,rc[1560]+6                                 # feet position on the road
figs=[]
for s,h in zip(srcs,hts):
    im=Image.open(s).convert('LA'); sc=h*3.2/im.height  # keep 3.2x supersampling
    figs.append(im.resize((int(im.width*sc),int(im.height*sc)),Image.LANCZOS))

def ease(u): u=np.clip(u,0,1); return u*u*(3-2*u)
def lerp(a,b,u): return a+(b-a)*u
# age weights over time: child -> youth -> man -> old
TR=[(2.3,2.75),(3.1,3.55),(3.9,4.4)]
def age_state(t):
    a=0.0
    for k,(s,e) in enumerate(TR): a+=ease((t-s)/(e-s))
    return a
# camera: zoom factor relative to full world, and centre
def camera(t):
    z1=lerp(1.0,2.1,ease(t/2.0))
    z2=lerp(2.1,3.4,ease((t-2.0)/3.0))
    z3=lerp(3.4,1.15,ease((t-5.0)/2.0))
    z=z1 if t<2 else (z2 if t<5 else z3)
    cx=lerp(WW/2,FX,ease(min(t,5)/3.2)); cx=lerp(cx,lerp(FX,WW/2,0.6),ease((t-5)/2))
    cy=lerp(WH/2,FY-210,ease(min(t,5)/3.2)); cy=lerp(cy,lerp(FY-210,WH/2,0.7),ease((t-5)/2))
    return z,cx,cy

rng=np.random.default_rng(3)
P=140; px=rng.uniform(0,W,P); py=rng.uniform(0,H,P); pr=rng.uniform(1,3.5,P); pv=rng.uniform(4,18,P); pa=rng.uniform(.15,.5,P)
vy,vx=np.mgrid[0:H,0:W]
vig=np.clip(1-0.6*(((vx-W/2)/(W*.66))**2+((vy-H/2)/(H*.66))**2),0.3,1)[...,None]

font=ImageFont.truetype('/usr/share/fonts/opentype/fonts-hosny-amiri/Amiri-Regular.ttf',118)
TXT='فيلم مستوحى من قصة تمو'
title=Image.new('L',(W,H),0); d=ImageDraw.Draw(title)
d.text((W/2,H/2),TXT,font=font,fill=255,anchor='mm',direction='rtl',language='ar')
title=np.asarray(title)/255.
ivory=np.array([0.96,0.92,0.82])

ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error',
  '-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',AUD,
  '-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-r',str(FPS),
  '-c:a','aac','-b:a','192k','-t',f'{DUR:.2f}','-shortest','-movflags','+faststart',OUT],stdin=subprocess.PIPE)

wimg=Image.fromarray((world*255).astype(np.uint8))
for f in range(N):
    t=f/FPS
    if t<7.3:
        z,cx,cy=camera(t)
        vw,vh=WW/z,WH/z
        cx=np.clip(cx,vw/2,WW-vw/2); cy=np.clip(cy,vh/2,WH-vh/2)
        cx=float(cx); cy=float(cy); vw=float(vw); vh=float(vh); box=(cx-vw/2,cy-vh/2,cx+vw/2,cy+vh/2)
        bg=wimg.resize((W,H),Image.BICUBIC,box=box)
        if z>1.8: bg=bg.filter(ImageFilter.GaussianBlur(float(min(3.0,(z-1.8)*2.2))))   # shallow depth of field
        img=np.asarray(bg)/255.
        s=float(W/vw)                                       # world->screen scale
        a=age_state(t); i0=min(int(a),2); u=a-i0
        if a>=3: i0,u=2,1.0
        breath=1+0.006*np.sin(t*2*np.pi/2.6)
        fxs=(FX-box[0])*s; fys=(FY-box[1])*s
        # contact shadow, stretched away from the dawn sun
        sh=Image.new('L',(W,H),0); hh=float(lerp(hts[i0],hts[min(i0+1,3)],u)*s)
        ImageDraw.Draw(sh).ellipse((fxs-hh*.12,fys-hh*.03,fxs+hh*.55,fys+hh*.035),fill=170)
        sh=np.asarray(sh.filter(ImageFilter.GaussianBlur(float(max(2,hh*.03)))))/255.
        img=img*(1-0.5*sh[...,None])
        layer=np.zeros((H,W)); alpha=np.zeros((H,W))
        for idx,wt in ((i0,1-u),(min(i0+1,3),u)):
            if wt<0.004: continue
            fg=figs[idx]; k=s*breath/3.2
            fw,fh_=max(1,int(fg.width*k)),max(1,int(fg.height*k))
            g=np.asarray(fg.resize((fw,fh_),Image.LANCZOS))/255.
            x0=int(round(fxs-fw/2)); y0=int(round(fys-fh_))
            xa,ya=max(0,x0),max(0,y0); xb,yb=min(W,x0+fw),min(H,y0+fh_)
            if xb<=xa or yb<=ya: continue
            gg=g[ya-y0:yb-y0,xa-x0:xb-x0]
            la=gg[...,1]*wt
            layer[ya:yb,xa:xb]+=gg[...,0]*la; alpha[ya:yb,xa:xb]+=la
        alpha=alpha.clip(0,1); fl=np.where(alpha>0,layer/np.maximum(alpha,1e-6),0)
        fl=0.06+0.9*fl
        # dawn rim light on the sun-facing (left) edge
        rim=np.clip(alpha-np.roll(blur(alpha,3),-6,axis=1),0,1)*0.35
        figc=grade(fl,0.35)+rim[...,None]*np.array([1,.75,.45])
        img=img*(1-alpha[...,None])+figc*alpha[...,None]
        # soft light bloom at each age transition
        for s0,e0 in TR:
            pk=np.exp(-((t-(s0+e0)/2)/0.22)**2)
            if pk>0.01: img=img+pk*0.30*np.exp(-(((vx-fxs)/(hh*1.2))**2+((vy-(fys-hh*.6))/(hh*.9))**2))[...,None]*np.array([1,.85,.6])
        # drifting dust motes in the dawn light
        dl=Image.new('L',(W,H),0); dd=ImageDraw.Draw(dl)
        for j in range(P):
            xx=(px[j]+pv[j]*t*3)%W; yy=(py[j]-pv[j]*t*.8+6*np.sin(t+j))%H
            dd.ellipse((xx-pr[j],yy-pr[j],xx+pr[j],yy+pr[j]),fill=int(255*pa[j]))
        dust=np.asarray(dl.filter(ImageFilter.GaussianBlur(1.5)))/255.
        img=img+dust[...,None]*np.array([1,.86,.62])*0.35
        # dawn: scene brightens over the first seconds
        img=img*lerp(0.55,1.0,ease(t/2.5))
        img=img*vig*(0.985+0.015*np.sin(t*37))
        img=img+rng.normal(0,0.022,(H,W))[...,None]
        fade=ease(t/0.6)*(1-ease((t-6.6)/0.7))
        img=img.clip(0,1)*fade
    else:
        a=ease((t-7.45)/0.8)
        img=title[...,None]*ivory*a
    ff.stdin.write((np.clip(img,0,1)*255).astype(np.uint8).tobytes())
ff.stdin.close(); ff.wait()
