import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, ArrowLeft, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const AddItem = () => {
  const [itemName, setItemName] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedNickname = localStorage.getItem('sidex_nickname');
    if (!savedNickname) {
      navigate('/login');
    } else {
      setNickname(savedNickname);
    }
  }, [navigate]);

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

  const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
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
      // 일반 아이템 사진은 가로 최대 1200px, 화질 70%로 가볍게 압축 적용
      const compressedBlob = await compressImage(photo, 1200, 0.7);
      const compressedFile = new File([compressedBlob], `item-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const fileName = `item-${Date.now()}.jpg`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sidex_images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sidex_images')
        .getPublicUrl(filePath);

      // 3. Insert record into 'sidex_items' table with recommender_name and location
      const { error: dbError } = await supabase
        .from('sidex_items')
        .insert([
          {
            item_name: itemName,
            image_url: publicUrl,
            recommender_name: nickname,
            location: location.trim() || null
          }
        ]);

      if (dbError) throw dbError;

      showToast('추천템이 성공적으로 등록되었습니다! 🎉');
      
      // Go back to feed after short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error: any) {
      console.error('Error submitting:', error);
      showToast(`등록 실패: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>새 추천템 등록하기</h2>
      </div>

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
            <div className="upload-subtext">여기를 눌러 추천할 물품 사진을 바로 촬영하세요.</div>
          </>
        ) : (
          <img src={preview} alt="미리보기" className="preview-image" />
        )}
      </div>
      
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef}
        onChange={handlePhotoCapture}
        style={{ display: 'none' }}
      />

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
        <label>추천 물품명</label>
        <input 
          type="text" 
          className="text-input" 
          placeholder="예: 덴탈 마스크 10박스" 
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>장소 (선택)</label>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <MapPin size={20} />
          </div>
          <input 
            type="text" 
            className="text-input" 
            style={{ paddingLeft: '42px' }}
            placeholder="예: 코엑스 C홀 오스템 부스" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <button 
        className="btn btn-primary" 
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <><div className="loader"></div> 등록 중...</>
        ) : (
          <><Send size={20} /> 추천하기</>
        )}
      </button>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default AddItem;
