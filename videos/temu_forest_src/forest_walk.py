# "The Tragedy of Temu" - forest teaser: eye contact, lowered gaze, walk into the forest.
import numpy as np, subprocess, sys
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage
W,H,FPS=1920,1080,25
N=248; DUR=N/FPS                                    # 9.92 s
FOREST,OUT,AUD=sys.argv[1],sys.argv[2],sys.argv[3]

def ease(u): u=np.clip(u,0,1); return float(u*u*(3-2*u))
def lerp(a,b,u): return a+(b-a)*u

# ---------- world: forest path, 16:9 crop of the reference, held at 2x for clean camera moves ----------
src=Image.open(FOREST).convert('RGB')
crop=src.crop((0,520,736,934))
S2=2                                                   # world is 1920x1080, stored at 2x
wbig=crop.resize((W*S2,H*S2),Image.LANCZOS).filter(ImageFilter.UnsharpMask(3,60,2))
wsoft=wbig.filter(ImageFilter.GaussianBlur(9))         # depth-of-field version
VPX,VPY=393*W/736,(780-520)*H/414                      # vanishing point of the path (world px)

# ---------- figure views ----------
def load(n):
    im=Image.open(n+'.png').convert('RGBA'); a=np.asarray(im).copy()
    m=a[...,3]>128; lab,k=ndimage.label(~m)            # close small holes left by the matting
    sizes=ndimage.sum(np.ones_like(lab),lab,range(1,k+1))
    for i,s in enumerate(sizes,1):
        if s<4000 and not (lab[0]==i).any() and not (lab[-1]==i).any(): a[lab==i,3]=255
    return Image.fromarray(a)
front,turn,back=load('front'),load('turn'),load('back')
NECK=345                                               # neck line in front.png pixels

FA=np.asarray(front).astype(float)
def head_down(k):
    """Lower the head of the front view by k in [0,1]: a smooth vertical warp above the neck
    (drop + foreshortening), with the face falling into shadow. No seams: rows are remapped."""
    if k<=0.001: return front
    hgt=FA.shape[0]; y=np.arange(hgt,dtype=float)
    disp=np.where(y<NECK, 34+0.10*(NECK-y), 34*np.clip(1-(y-NECK)/70,0,1))*k
    tgt=y+disp                                          # where each source row lands (monotonic)
    srcy=np.interp(y,tgt,y)                             # inverse map: output row -> source row
    y0=np.floor(srcy).astype(int).clip(0,hgt-1); y1=(y0+1).clip(0,hgt-1); fr=(srcy-y0)[:,None,None]
    o=FA[y0]*(1-fr)+FA[y1]*fr
    o[y<tgt[0]]=0                                       # nothing above the dropped crown
    shade=1-0.32*k*np.clip((NECK+20-y)/NECK,0,1)
    o[...,:3]*=shade[:,None,None]
    ey=240+(34+0.10*(NECK-240))*k                       # eyes, after the drop: shade the lids as gaze lowers
    gy,gx=np.mgrid[0:hgt,0:FA.shape[1]]
    o[...,:3]*=(1-0.38*k*np.exp(-(((gx-322)/62)**2+((gy-ey)/16)**2)))[...,None]
    return Image.fromarray(o.clip(0,255).astype(np.uint8))

# ---------- perspective: figure height from foot position on the path ----------
FY0=1450; H0=1000; C=H0/(FY0-VPY)
def walk_pos(t):
    s=max(0.0,t-6.0)
    d=1+0.33*s+0.06*s*s                                # unhurried, recedes ever slower on screen
    fy=VPY+(FY0-VPY)/d
    fx=lerp(1080,VPX+18,1-1/d)
    return fx,fy,C*(fy-VPY)

def camera(t,fx,fy,h):
    face=(fx-25, fy-h+0.156*h)
    if t<3.0:   z=lerp(1.65,2.25,ease(t/3.0)); c=face
    elif t<5.0:
        u=ease((t-3)/2.0); z=lerp(2.25,1.30,u)
        c=(face[0],lerp(face[1],face[1]+0.30*h,u))     # tilt down with his gaze, reveal the body
    else:
        u=ease((t-5)/1.6); z=lerp(1.30,1.06,u)
        tgt=(lerp(face[0],fx,0.6),lerp(face[1]+0.30*h,fy-0.55*h,1.0))
        c=(lerp(fx-25,tgt[0],u),lerp(face[1]+0.30*h,max(540/z,min(tgt[1],H-540/z)),u))
        if t>6.6: z=lerp(1.06,1.16,ease((t-6.6)/3.3))  # slow push as he goes deeper (tracking feel)
    vw,vh=W/z,H/z
    cx=float(np.clip(c[0],vw/2,W-vw/2)); cy=float(np.clip(c[1],vh/2,H-vh/2))
    return z,cx,cy

def grade_fig(rgba,dist):
    a=np.asarray(rgba).astype(float)/255.
    lum=a[...,:3]@np.array([.3,.59,.11])
    sep=a[...,:3]*0.45+lum[...,None]*0.55               # pull the sepia print toward neutral
    amb=np.array([0.78,0.92,0.90])                      # cool forest ambience
    c=sep*amb*0.56
    fog=np.array([0.30,0.40,0.40]); fm=0.42*dist        # atmospheric mist with distance
    c=c*(1-fm)+fog*fm
    al=ndimage.minimum_filter(a[...,3],3)              # trim the matte fringe
    return c,ndimage.uniform_filter(al,3)

yy,xx=np.mgrid[0:H,0:W]
vig=np.clip(1-0.55*(((xx-W/2)/(W*.62))**2+((yy-H/2)/(H*.62))**2),0.35,1)[...,None]
rng=np.random.default_rng(5)
# light shafts through the canopy
rays=Image.new('L',(W*2,H*2),0); dr=ImageDraw.Draw(rays)
for i in range(9):
    x0=rng.uniform(300,3600); wdt=rng.uniform(40,140)
    dr.polygon([(x0,0),(x0+wdt,0),(x0+wdt+900,H*2),(x0+900-wdt*.5,H*2)],fill=int(rng.uniform(40,90)))
rays=np.asarray(rays.filter(ImageFilter.GaussianBlur(60)).resize((W,H)))/255.
mist=np.asarray(Image.fromarray((rng.uniform(0,1,(18,32))*255).astype(np.uint8)).resize((W,H),Image.BICUBIC))/255.

ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
   '-i',AUD,'-c:v','libx264','-preset','slow','-crf','20','-tune','film','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k',
   '-t',f'{DUR:.2f}','-shortest','-movflags','+faststart',OUT],stdin=subprocess.PIPE)

STEP=1.05                                              # seconds per step
for f in range(N):
    t=f/FPS
    fx,fy,h=walk_pos(t)
    z,cx,cy=camera(t,fx,fy,h)
    box=tuple(v*S2 for v in (cx-W/z/2,cy-H/z/2,cx+W/z/2,cy+H/z/2))
    dof=min(1.0,max(0.0,(z-1.0)/0.9))*(1-0.6*ease((t-7)/2.5))
    bg=np.asarray(wbig.resize((W,H),Image.BICUBIC,box=box)).astype(float)/255.
    if dof>0.01:
        bs=np.asarray(wsoft.resize((W,H),Image.BICUBIC,box=box)).astype(float)/255.
        bg=bg*(1-dof)+bs*dof
    img=bg*0.92
    # which view of Temu: front (gaze, then head lowers) -> turning -> walking away (back)
    k=ease((t-3.0)/1.6)
    views=[]
    u1=ease((t-5.05)/0.40); u2=ease((t-5.50)/0.40)
    if u1<1: views.append((head_down(k),1-u1))
    if u1>0 and u2<1: views.append((turn,min(u1,1-u2)))
    if u2>0: views.append((back,u2))
    walking=t>6.0
    ph=(t-6.0)/STEP*np.pi if walking else 0
    bob=abs(np.sin(ph))*h*0.010 if walking else h*0.003*np.sin(t*2*np.pi/3.2)   # breathing when still
    sway=np.sin(ph)*1.3 if walking else 0
    s=z                                                  # world->screen scale
    sfx=(fx-cx)*s+W/2; sfy=(fy-cy)*s+H/2
    dist=float(np.clip(1-h/H0,0,1))
    figrgb=np.zeros((H,W,3)); figa=np.zeros((H,W))
    for im,wt in views:
        if wt<0.003: continue
        th=h*s; scl=th/im.height
        fw,fh=max(1,int(im.width*scl)),max(1,int(th))
        g=im.resize((fw,fh),Image.LANCZOS)
        if sway: g=g.rotate(sway,resample=Image.BICUBIC,center=(fw/2,fh))
        if th>900: g=g.filter(ImageFilter.UnsharpMask(2,40,2))
        c,al=grade_fig(g,dist)
        x0=int(round(sfx-fw/2+np.sin(ph)*h*s*0.008)); y0=int(round(sfy-fh-bob*s))
        xa,ya=max(0,x0),max(0,y0); xb,yb=min(W,x0+fw),min(H,y0+fh)
        if xb<=xa or yb<=ya: continue
        cc=c[ya-y0:yb-y0,xa-x0:xb-x0]; aa=al[ya-y0:yb-y0,xa-x0:xb-x0]*wt
        figrgb[ya:yb,xa:xb]+=cc*aa[...,None]; figa[ya:yb,xa:xb]+=aa
    figa=figa.clip(0,1); figc=np.where(figa[...,None]>0,figrgb/np.maximum(figa,1e-6)[...,None],0)
    # contact shadow on the path
    sh=Image.new('L',(W,H),0); hs=h*s
    ImageDraw.Draw(sh).ellipse((sfx-hs*.22,sfy-hs*.025,sfx+hs*.22,sfy+hs*.02),fill=150)
    sh=np.asarray(sh.filter(ImageFilter.GaussianBlur(float(max(2,hs*.03)))))/255.
    img=img*(1-0.45*sh[...,None])
    # soft top light on the figure's edge from the canopy
    rim=np.clip(figa-np.roll(ndimage.uniform_filter(figa,7),5,axis=0),0,1)*0.10
    img=img*(1-figa[...,None])+figc*figa[...,None]+rim[...,None]*np.array([.75,.9,.85])
    # atmosphere: drifting mist and light shafts
    m=np.roll(mist,int(t*14),axis=1)
    img=img+0.10*m[...,None]*np.array([.6,.75,.75])*(0.6+0.4*dist)
    img=img+rays[...,None]*np.array([.55,.7,.65])*0.22*(0.85+0.15*np.sin(t*0.9))
    # grade: teal-green, lifted blacks, vignette, grain
    img=0.035+img*0.97
    img=img*vig+rng.normal(0,0.012,(H,W))[...,None]
    fade=ease(t/0.5)*(1-ease((t-(DUR-0.7))/0.7))
    ff.stdin.write((np.clip(img*fade,0,1)*255).astype(np.uint8).tobytes())
ff.stdin.close(); ff.wait()
