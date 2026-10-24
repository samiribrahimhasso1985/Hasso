import numpy as np, wave
SR=48000; DUR=9.92; n=int(SR*DUR); t=np.arange(n)/SR
rng=np.random.default_rng(11)
def ease(u): u=np.clip(u,0,1); return u*u*(3-2*u)
def lp(x,a):                                   # one-pole low-pass
    y=np.empty_like(x); s=0.0
    for i in range(len(x)): s+=a*(x[i]-s); y[i]=s
    return y
# mountain wind: filtered noise with slow gusts
wn=rng.standard_normal(n)
from scipy.signal import lfilter, butter
b,a=butter(2,[180/(SR/2),900/(SR/2)],'band'); wind=lfilter(b,a,wn)
b2,a2=butter(2,[1200/(SR/2),3000/(SR/2)],'band'); air=lfilter(b2,a2,rng.standard_normal(n))
gust=0.6+0.4*np.sin(2*np.pi*0.23*t+1)*np.sin(2*np.pi*0.11*t)
wind=wind/np.abs(wind).max()*gust*0.16
air=air/np.abs(air).max()*0.05*ease((t-2)/3)*(1-ease((t-5)/0.6))
# piano: additive partials with hammer attack and decay
def piano(f,start,vel,dec=2.8):
    tt=t-start; m=tt>=0; o=np.zeros(n); x=tt[m]
    env=vel*(1-np.exp(-x*300))*np.exp(-x/dec)
    for k,amp in enumerate([1,.55,.3,.18,.1,.06],1):
        o[m]+=amp*np.sin(2*np.pi*f*k*(1+0.0004*k*k)*x)*np.exp(-x*k*0.35)
    o[m]*=env; return o
NOTE=lambda s:440*2**((s-69)/12)
mus=np.zeros(n)
# A minor lament
for s,tm,v in [(57,0.35,.35),(64,0.36,.25),(72,1.35,.3),(71,2.1,.28),(69,2.85,.3),(64,2.86,.2),
               (72,3.55,.32),(76,4.25,.34),(60,4.26,.22),(53,4.95,.38),(65,4.96,.25),(69,4.97,.22),
               (69,7.45,.30),(57,7.46,.22),(64,7.47,.18)]:
    mus+=piano(NOTE(s),tm,v,3.2 if tm<7 else 2.4)
# swelling string pad, rising with the passage of the years
pad=np.zeros(n)
for s in (45,52,57,60,64):
    for det in (-0.12,0,0.12):
        ph=2*np.pi*NOTE(s+det)*t
        pad+=np.sin(ph)+0.3*np.sin(2*ph)+0.12*np.sin(3*ph)
pad=lp(pad/15,0.05)
pad*=ease((t-1.6)/3.2)*(1-ease((t-5.0)/0.9))*0.45
drone=np.sin(2*np.pi*55*t)*0.10*ease((t-0.5)/2)*(1-ease((t-5.0)/1.0))
mix=mus*0.55+pad+drone
# room reverb
ir_n=int(SR*1.8); ir=rng.standard_normal(ir_n)*np.exp(-np.arange(ir_n)/SR/0.45); ir[0]=0
from scipy.signal import fftconvolve
mix=mix+0.12*fftconvolve(mix,ir)[:n]/np.sqrt(ir_n)*8
# silence beat around 6.0-7.3: everything but faint wind dips
duck=1-0.85*ease((t-5.6)/0.6)*(1-ease((t-7.3)/0.3))
wind_level=1-0.6*ease((t-5.6)/0.6)*(1-ease((t-7.3)/0.3))-0.5*ease((t-8.2)/1.0)
out=mix*duck+wind*wind_level+air
out*=ease(t/0.25)*(1-ease((t-(DUR-0.9))/0.9))
out=out/np.abs(out).max()*0.85
st=np.stack([out,np.roll(out,int(SR*0.012))*0.97],1)
with wave.open('score.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes())
