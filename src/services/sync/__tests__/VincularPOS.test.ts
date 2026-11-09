import {test,expect,jest,beforeEach} from '@jest/globals';
import {leerQRPOS,vincularDesdeQR} from '../VincularPOS';
import {guardarConfiguracionPOS} from '../PosLanConfig';
jest.mock('../PosLanConfig',()=>({guardarConfiguracionPOS:jest.fn()}));
const qr=()=>({tipo:'pizza-mya-pos',version:1,urlBase:'http://192.168.1.78:3101',codigo:'c'.repeat(64),venceEn:Date.now()+120000});
beforeEach(()=>{jest.clearAllMocks();});
test('solo admite QR propios con direccion privada y vencimiento valido',()=>{
 expect(leerQRPOS(JSON.stringify(qr())).urlBase).toBe(qr().urlBase);
 for(const cambio of [{tipo:'otro'},{urlBase:'http://8.8.8.8:3101'},{codigo:'x'},{venceEn:Date.now()-1},{urlBase:'http://192.168.999.1:3101'}])expect(()=>leerQRPOS(JSON.stringify({...qr(),...cambio}))).toThrow();
 expect(()=>leerQRPOS('https://example.com')).toThrow();
});
test('canjea el codigo y guarda el token; no altera la vinculacion si falla',async()=>{
 const fetchMock=jest.spyOn(globalThis,'fetch');
 try{
  fetchMock.mockResolvedValue({ok:true,json:async()=>({versionContrato:2,token:'a'.repeat(64)})} as Response);
  await vincularDesdeQR(JSON.stringify(qr()));expect(guardarConfiguracionPOS).toHaveBeenCalledWith(expect.objectContaining({urlBase:qr().urlBase,token:'a'.repeat(64)}));
  jest.mocked(guardarConfiguracionPOS).mockClear();
  fetchMock.mockResolvedValue({ok:false,json:async()=>({error:'QR utilizado'})} as Response);
  await expect(vincularDesdeQR(JSON.stringify(qr()))).rejects.toThrow('QR utilizado');expect(guardarConfiguracionPOS).not.toHaveBeenCalled();
 }finally{fetchMock.mockRestore();}
});
