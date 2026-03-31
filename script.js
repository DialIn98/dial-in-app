function takePhoto(){
  const flash=document.getElementById('flash');flash.classList.add('snap');setTimeout(()=>flash.classList.remove('snap'),120);
  drawCompositeFrame();
  compCanvas.toBlob(async blob=>{
    const url=URL.createObjectURL(blob);
    const img=document.getElementById('thumb-img');img.src=url;img.style.display='block';
    document.getElementById('thumb-placeholder').style.display='none';
    try{
      const reader=new FileReader();
      reader.onloadend=async()=>{
        const base64=reader.result.split(',')[1];
        const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
        const fileName=`DialIn_${ts}.jpg`;
        if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Filesystem){
          const {Filesystem,Directory}=window.Capacitor.Plugins;
          await Filesystem.writeFile({path:fileName,data:base64,directory:'DOCUMENTS',recursive:true});
          if(window.Capacitor.Plugins.MediaPlugin){
            await window.Capacitor.Plugins.MediaPlugin.savePhoto({path:fileName});
          }
        }
        showToast('📸  PHOTO SAVED');
      };
      reader.readAsDataURL(blob);
    }catch(e){
      const a=document.createElement('a');const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
      a.href=url;a.download=`DialIn_${ts}.jpg`;a.click();showToast('📸  PHOTO SAVED');
    }
  },'image/jpeg',0.95);
}
