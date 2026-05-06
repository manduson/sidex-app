import React, { useState, useRef } from 'react';
import { Camera, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Home = () => {
  const [itemName, setItemName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    if (!photo) {
      showToast('사진을 촬영해주세요.');
      return;
    }
    if (!itemName.trim()) {
      showToast('물품명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload photo to Supabase Storage 'sidex_images'
      const fileExt = photo.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sidex_images')
        .upload(filePath, photo);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sidex_images')
        .getPublicUrl(filePath);

      // 3. Insert record into 'sidex_items' table
      const { error: dbError } = await supabase
        .from('sidex_items')
        .insert([
          {
            item_name: itemName,
            image_url: publicUrl,
            is_purchased: false
          }
        ]);

      if (dbError) throw dbError;

      showToast('전송이 완료되었습니다! 🎉');
      
      // Reset form
      setPhoto(null);
      setPreview(null);
      setItemName('');
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      console.error('Error submitting:', error);
      showToast(`전송 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className={`upload-card ${preview ? 'has-image' : ''}`}
        onClick={() => !preview && fileInputRef.current?.click()}
      >
        {!preview ? (
          <>
            <div className="upload-icon">
              <Camera size={32} />
            </div>
            <div className="upload-text">카메라 켜기</div>
            <div className="upload-subtext">여기를 눌러 물품 사진을 바로 촬영하세요.</div>
          </>
        ) : (
          <img src={preview} alt="미리보기" className="preview-image" />
        )}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef}
          onChange={handlePhotoCapture}
        />
      </div>

      {preview && (
        <button 
          className="btn" 
          style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', padding: '10px' }}
          onClick={() => {
            setPhoto(null);
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        >
          다시 촬영하기
        </button>
      )}

      <div className="input-group">
        <label>물품명</label>
        <input 
          type="text" 
          className="text-input" 
          placeholder="예: 덴탈 마스크 10박스" 
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
      </div>

      <button 
        className="btn btn-primary" 
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <><div className="loader"></div> 전송 중...</>
        ) : (
          <><Send size={20} /> 원장님께 전송하기</>
        )}
      </button>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
};

export default Home;
