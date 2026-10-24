from PIL import Image
from rembg import remove, new_session
import sys
src=Image.open(sys.argv[1]).convert('RGB')
cols=[(5,210),(216,421),(428,632),(639,844)]
rows=[(7,317),(324,628),(636,942),(949,1258)]
s=new_session(sys.argv[2])
c=cols[int(sys.argv[3])]
for i,r in enumerate(rows):
    cell=src.crop((c[0]+4,r[0]+4,c[1]-4,r[1]-4))
    cell=cell.resize((cell.width*4,cell.height*4),Image.LANCZOS)
    out=remove(cell,session=s,post_process_mask=True)
    out=out.crop(out.getbbox())
    out.save(f'{sys.argv[4]}{i}.png'); print(i,out.size)
