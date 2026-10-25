from PIL import Image
from rembg import remove, new_session
import sys
src=Image.open(sys.argv[1]).convert('RGB')
cells={'front':(14,44,421,640),'side':(431,44,836,640),'turn':(14,651,421,1254),'back':(431,651,836,1254)}
s=new_session('isnet-general-use')
for k,b in cells.items():
    c=src.crop(b); c=c.resize((c.width*3,c.height*3),Image.LANCZOS)
    o=remove(c,session=s,post_process_mask=True)
    bb=o.getbbox(); o=o.crop(bb); o.save(f'{k}.png'); print(k,o.size,bb)
