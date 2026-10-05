
import sys, zipfile, struct, hashlib
from asn1crypto import cms
from cryptography.hazmat.primitives.serialization import load_der_public_key
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidSignature

def content_info(path):
    z=zipfile.ZipFile(path)
    sb=z.read("signed.bin")
    pos=1; nl=struct.unpack(">I", sb[pos:pos+4])[0]; pos+=4+nl
    while pos+4<=len(sb):
        ok=True; save=pos
        for _ in range(4):
            if pos+4>len(sb): ok=False; break
            L=struct.unpack(">I", sb[pos:pos+4])[0]; pos+=4
            if L>len(sb)-pos: ok=False; break
            pos+=L
        if not ok: pos=save; break
    pLen=struct.unpack(">H", sb[pos+2:pos+4])[0]
    sd=sb[pos+16+pLen:-32]
    return cms.ContentInfo.load(sd)['content']

def verify(path):
    signed=content_info(path)
    si=signed['signer_infos'][0]
    sa=si['signed_attrs'].dump()
    msgs=[b'\x31'+sa[1:], sa]
    for c in [x.chosen for x in signed['certificates']]:
        pub=load_der_public_key(c.public_key.dump())
        for m in msgs:
            try:
                pub.verify(si['signature'].native, m, ec.ECDSA(hashes.SHA256()))
                return True
            except InvalidSignature:
                pass
    return False

if __name__ == "__main__":
    ok=verify(sys.argv[1])
    print("SIG_OK" if ok else "SIG_BAD")
    sys.exit(0 if ok else 1)
