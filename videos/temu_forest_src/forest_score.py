import numpy as np, wave
from scipy.signal import lfilter, butter, fftconvolve
SR=48000; DUR=9.92; n=int(SR*DUR); t=np.arange(n)/SR
rng=np.random.default_rng(21)
def ease(u): u=np.clip(u,0,1); return u*u*(3-2*u)
def band(x,lo,hi): b,a=butter(2,[lo/(SR/2),hi/(SR/2)],'band'); return lfilter(b,a,x)
# forest ambience: soft wind in the canopy
wind=band(rng.standard_normal(n),150,1400); wind/=np.abs(wind).max()
wind*=0.10*(0.7+0.3*np.sin(2*np.pi*0.17*t)*np.sin(2*np.pi*0.07*t+1))
leaves=band(rng.standard_normal(n),2500,7000); leaves/=np.abs(leaves).max(); leaves*=0.02*(0.5+0.5*np.sin(2*np.pi*0.3*t)**2)
# distant birds: short chirp phrases
birds=np.zeros(n)
for st,f0,cnt in [(0.9,3800,3),(2.7,4600,2),(4.4,3300,4),(6.9,4200,3),(8.4,3600,2)]:
    for k in range(cnt):
        s0=int((st+k*0.16)*SR); L=int(0.09*SR); x=np.arange(L)/SR
        f=f0+1400*np.sin(np.pi*x/0.09)
        ch=np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*x/0.09)**2
        birds[s0:s0+L]+=ch*0.025
# footsteps on soft earth: start when he walks, fading with distance
steps=np.zeros(n); STEP=1.05
for i in range(8):
    ts=6.0+0.5*STEP+i*STEP
    if ts>DUR-0.2: break
    s0=int(ts*SR); L=int(0.16*SR); x=np.arange(L)/SR
    thud=np.sin(2*np.pi*70*x)*np.exp(-x*40)
    crunch=band(rng.standard_normal(L),600,4000)*np.exp(-x*28)
    v=0.30/(1+0.55*i)
    steps[s0:s0+L]+=v*(0.6*thud+0.5*crunch/np.abs(crunch).max())
# music: quiet piano in D minor over a slow string pad
NOTE=lambda m:440*2**((m-69)/12)
def piano(f,start,vel,dec=3.0):
    tt=t-start; m=tt>=0; o=np.zeros(n); x=tt[m]
    env=vel*(1-np.exp(-x*250))*np.exp(-x/dec)
    for k,a in enumerate([1,.5,.28,.15,.08],1): o[m]+=a*np.sin(2*np.pi*f*k*(1+0.0004*k*k)*x)*np.exp(-x*k*0.4)
    o[m]*=env; return o
mus=np.zeros(n)
for m,tm,v in [(50,0.4,.28),(57,0.41,.18),(65,1.2,.22),(64,2.2,.20),(62,3.1,.24),(57,3.11,.15),
               (60,4.2,.18),(58,5.1,.24),(53,5.11,.16),(69,6.2,.20),(67,7.1,.18),(65,8.0,.20),(62,8.01,.14),(50,8.02,.16)]:
    mus+=piano(NOTE(m),tm,v)
pad=np.zeros(n)
for m in (38,45,50,53,57):
    for d in (-0.1,0,0.1):
        ph=2*np.pi*NOTE(m+d)*t; pad+=np.sin(ph)+0.25*np.sin(2*ph)
b,a=butter(2,900/(SR/2)); pad=lfilter(b,a,pad/15)*0.30*ease((t-0.8)/3)*(0.8+0.2*ease((t-5)/2))
mix=mus*0.6+pad
ir_n=int(SR*2.2); ir=rng.standard_normal(ir_n)*np.exp(-np.arange(ir_n)/SR/0.6); ir[0]=0
mix=mix+0.9*fftconvolve(mix,ir)[:n]/np.sqrt(ir_n)
birds=birds+0.6*fftconvolve(birds,ir[:int(SR*1.2)])[:n]/np.sqrt(SR*1.2)
out=mix+wind+leaves+birds+steps
out*=ease(t/0.4)*(1-ease((t-(DUR-0.8))/0.8))
out=out/np.abs(out).max()*0.85
st=np.stack([out,0.97*np.roll(out,int(SR*0.011))],1)
with wave.open('forest_score.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes())
