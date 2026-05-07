/* eslint-disable react-hooks/refs, @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, MessageSquare, Image, ChevronDown, ChevronUp, Upload, MoreVertical, Edit2, Trash2, X, Heart } from 'lucide-react';

interface SidexComment {
  id: number;
  commenter_name: string;
  content: string;
  created_at: string;
}

interface SidexItem {
  id: number;
  item_name: string;
  image_url: string;
  recommender_name: string;
  location?: string;
  created_at: string;
  sidex_comments?: SidexComment[];
  likesCount?: number;
  isLikedByMe?: boolean;
}

interface ImageSliderProps {
  image_url: string;
  item_name: string;
}

const ImageSlider: React.FC<ImageSliderProps> = ({ image_url, item_name }) => {
  const urls = image_url ? image_url.split(',') : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartRef = useRef<number | null>(null);

  if (urls.length === 0) return null;
  if (urls.length === 1) {
    return <img src={urls[0]} alt={item_name} style={{ width: '100%', height: '280px', objectFit: 'cover', display: 'block' }} />;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.touches[0].clientX;
    
    // 왼쪽으로 스와이프 (다음 사진)
    if (diff > 50) {
      handleNext();
      touchStartRef.current = null;
    }
    // 오른쪽으로 스와이프 (이전 사진)
    else if (diff < -50) {
      handlePrev();
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % urls.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  return (
    <div 
      style={{ position: 'relative', width: '100%', height: '280px', overflow: 'hidden', background: '#F8FAFC' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 슬라이드 이미지 컨테이너 */}
      <div style={{
        display: 'flex',
        width: `${urls.length * 100}%`,
        height: '100%',
        transform: `translateX(-${(currentIndex * 100) / urls.length}%)`,
        transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
      }}>
        {urls.map((url, idx) => (
          <div key={idx} style={{ width: '100%', height: '100%', flexShrink: 0 }}>
            <img src={url} alt={`${item_name} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>

      {/* 좌우 탐색 단추 */}
      <button 
        onClick={handlePrev}
        style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(4px)',
          border: 'none',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 2,
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#1E293B'
        }}
      >
        ‹
      </button>
      <button 
        onClick={handleNext}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(4px)',
          border: 'none',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 2,
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#1E293B'
        }}
      >
        ›
      </button>

      {/* 슬라이드 도트 인디케이터 */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '6px',
        zIndex: 2,
        background: 'rgba(0,0,0,0.3)',
        padding: '4px 8px',
        borderRadius: '10px',
        backdropFilter: 'blur(2px)'
      }}>
        {urls.map((_, idx) => (
          <div 
            key={idx} 
            style={{
              width: currentIndex === idx ? '8px' : '6px',
              height: currentIndex === idx ? '8px' : '6px',
              borderRadius: '50%',
              background: currentIndex === idx ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s'
            }}
          />
        ))}
      </div>

      {/* 우측 상단 현재 페이지 카운터 */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '4px 8px',
        borderRadius: '12px',
        zIndex: 2
      }}>
        {currentIndex + 1}/{urls.length}
      </div>
    </div>
  );
};

const Feed = () => {
  const queryClient = useQueryClient();
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
  const [submittingComment, setSubmittingComment] = useState<{ [key: number]: boolean }>({});
  const [showMap, setShowMap] = useState(false);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [isFullscreenMapOpen, setIsFullscreenMapOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<SidexItem | null>(null);
  const [activeCommentItemId, setActiveCommentItemId] = useState<number | null>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);

  const { data: isServerOn = true } = useQuery({
    queryKey: ['serverStatus'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sidex_map').select('image_url').eq('id', 3).maybeSingle();
      if (error) throw error;
      return data ? data.image_url === 'ON' : true;
    }
  });

  const { data: mapData } = useQuery({
    queryKey: ['mapData'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sidex_map').select('image_url').eq('id', 1).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data?.image_url) return { url: null, name: '' };
      const parts = data.image_url.split('|');
      return { url: parts[0], name: parts.length > 1 ? parts[1] : '' };
    }
  });
  const mapUrl = mapData?.url || null;
  const mapFileName = mapData?.name || '';

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ['feedItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sidex_items')
        .select('*, sidex_comments(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const currentNickname = localStorage.getItem('sidex_nickname') || '';

      return (data || []).map((item: any) => {
        const rawComments = item.sidex_comments || [];
        const likes = rawComments.filter((c: any) => c.content === '__LIKE__');
        const actualComments = rawComments.filter((c: any) => c.content !== '__LIKE__');

        return {
          ...item,
          likesCount: likes.length,
          isLikedByMe: likes.some((c: any) => c.commenter_name === currentNickname),
          sidex_comments: actualComments.sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        };
      });
    }
  });

  const handleToggleServer = async () => {
    const nextState = !isServerOn;
    // 낙관적 업데이트
    queryClient.setQueryData(['serverStatus'], nextState);

    try {
      const { error } = await supabase
        .from('sidex_map')
        .upsert({ id: 3, image_url: nextState ? 'ON' : 'OFF' });

      if (error) throw error;
    } catch (err) {
      console.error('Error updating server status:', err);
      alert('서버 상태 변경에 실패했습니다.');
      queryClient.setQueryData(['serverStatus'], !nextState);
    }
  };

  const getActiveUsers = () => {
    const usersSet = new Set<string>();
    
    // 현재 로그인한 사용자 추가
    if (nickname) usersSet.add(nickname);
    
    // 관리자 항상 포함되게 보정
    usersSet.add('만두');

    items.forEach(item => {
      if (item.recommender_name) usersSet.add(item.recommender_name);
      if (item.sidex_comments) {
        item.sidex_comments.forEach((c: any) => {
          if (c.commenter_name) usersSet.add(c.commenter_name);
        });
      }
    });

    return Array.from(usersSet);
  };

  useEffect(() => {
    const savedNickname = localStorage.getItem('sidex_nickname');
    if (!savedNickname) {
      navigate('/login');
      return;
    }
    setNickname(savedNickname);
    // 안 A: 실시간 구독 제거 (TanStack Query 캐싱으로 대체)
  }, [navigate]);



  const handleDelete = async (id: number) => {
    if (!window.confirm('정말 이 추천템을 삭제하시겠습니까?')) return;
    try {
      // 1. 해당 추천템에 연결된 모든 댓글 먼저 삭제 (외래키 제약조건 위반 방지)
      const { error: commentError } = await supabase
        .from('sidex_comments')
        .delete()
        .eq('item_id', id)
        .select();

      if (commentError) throw commentError;

      // 2. 추천템 삭제
      const { data: itemData, error } = await supabase
        .from('sidex_items')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      // 만약 RLS(Row Level Security) 정책에 의해 삭제가 차단된 경우, error는 없으나 삭제된 데이터(itemData)가 비어있음
      if (!itemData || itemData.length === 0) {
        alert('⚠️ 삭제 실패!\n\n이유: Supabase DB의 보안(RLS) 정책에 의해 삭제 권한이 차단되어 있습니다.\n\n해결방법:\nSupabase 대시보드 -> Database -> Policies에서 sidex_items 및 sidex_comments 테이블의 DELETE 권한을 "Enable" 또는 "true"로 설정해주셔야 합니다.');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['feedItems'] });
      alert('삭제되었습니다.');
    } catch (err: any) {
      console.error('Error deleting item:', err);
      alert('삭제 실패 원인: ' + (err?.message || JSON.stringify(err) || '알 수 없는 에러'));
    }
  };

  const handleChangePin = async () => {
    const newPin = window.prompt('새로운 관리자 PIN 번호 4자리를 입력해주세요:');
    if (newPin === null) return;
    if (newPin.trim().length !== 4 || isNaN(Number(newPin))) {
      alert('PIN 번호는 반드시 숫자 4자리여야 합니다!');
      return;
    }

    try {
      const { error } = await supabase
        .from('sidex_map')
        .upsert({ id: 2, image_url: newPin.trim() });

      if (error) throw error;
      alert('관리자 PIN 번호가 성공적으로 변경되었습니다! 🎉');
    } catch (err) {
      console.error('Error changing PIN:', err);
      alert('PIN 번호 변경에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      localStorage.removeItem('sidex_nickname');
      navigate('/login');
    }
  };

  const handleToggleLike = async (itemId: number, isLikedByMe: boolean) => {
    try {
      const currentNickname = nickname || localStorage.getItem('sidex_nickname') || '';
      if (!currentNickname) return;

      // 안 A: 낙관적 업데이트
      queryClient.setQueryData(['feedItems'], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((item: any) => {
          if (item.id === itemId) {
            return {
              ...item,
              isLikedByMe: !isLikedByMe,
              likesCount: !isLikedByMe ? (item.likesCount || 0) + 1 : Math.max(0, (item.likesCount || 0) - 1)
            };
          }
          return item;
        });
      });

      if (isLikedByMe) {
        // 이미 추천한 경우: __LIKE__ 댓글 삭제
        const { error } = await supabase
          .from('sidex_comments')
          .delete()
          .eq('item_id', itemId)
          .eq('commenter_name', currentNickname)
          .eq('content', '__LIKE__');

        if (error) throw error;
      } else {
        // 추천하지 않은 경우: __LIKE__ 댓글 추가
        const { error } = await supabase
          .from('sidex_comments')
          .insert([
            {
              item_id: itemId,
              commenter_name: currentNickname,
              content: '__LIKE__'
            }
          ]);

        if (error) throw error;
      }
      
      // 서버 데이터 최신화 (백그라운드 갱신)
      queryClient.invalidateQueries({ queryKey: ['feedItems'] });
    } catch (error) {
      console.error('Error toggling like:', error);
      // 에러 발생 시 원래 상태로 복구
      queryClient.invalidateQueries({ queryKey: ['feedItems'] });
    }
  };



  const compressImage = (file: File, maxWidth = 3600, quality = 0.95): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 원내 구형 PC 및 브라우저의 메모리 렉 예방을 위해 최적 해상도로 부드럽게 제한 (기본 3600px로 극상 화질 제공)
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // PNG 투명 배경이 검은색으로 깨지는 현상을 방지하고 고대비 가독성을 위해 배경을 흰색(#FFFFFF)으로 사전 채움
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            // 드로잉이 완전히 끝나고 블롭 변환 단계에서 안전하게 메모리 해제
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas 변환에 실패했습니다.'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // 만약 초고해상도(3600px) 로딩에 실패한 경우, 더 가벼운 1800px로 다운그레이드
        if (maxWidth > 1800) {
          console.warn('1차 초고해상도(3600px) PNG 로딩 실패로 1800px 모드로 재시도합니다.');
          compressImage(file, 1800, 0.9).then(resolve).catch(reject);
        } else if (maxWidth > 1000) {
          console.warn('2차 고해상도(1800px) PNG 로딩 실패로 1000px 모드로 재시도합니다.');
          compressImage(file, 1000, 0.8).then(resolve).catch(reject);
        } else {
          reject(new Error('이미지 파일 해상도가 비정상적으로 높거나 손상되었습니다.'));
        }
      };

      img.src = objectUrl;
    });
  };

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingMap(true);

    try {
      let fileToUpload: File | Blob = file;
      let fileName = `map-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;

      try {
        // 대용량 지도로 인한 Supabase 용량 제한을 방지하기 위해 1차로 안전한 압축 시도 (기본 3600px 초고화질)
        const compressedBlob = await compressImage(file, 3600, 0.95);
        const uploadName = `map-${Date.now()}.jpg`;
        fileToUpload = new File([compressedBlob], uploadName, { type: 'image/jpeg' });
        fileName = uploadName;
      } catch (compressionError) {
        console.warn('이미지 압축 중 실패 발생 (HEIC, PDF, CMYK 포맷의 경우): 브라우저가 읽지 못해 원본 파일로 즉시 대체 업로드합니다.', compressionError);
        
        // 브라우저가 못 읽는데 용량마저 6MB가 넘으면 Supabase 스토리지나 방화벽에서 100% 차단(ERR_CONNECTION_RESET)되므로 사전 경고
        if (file.size > 6 * 1024 * 1024) {
          throw new Error('이 파일은 브라우저가 압축할 수 없는 특수 포맷(인쇄용 CMYK, HEIC 등)이면서 동시에 파일 용량(6MB 초과)이 너무 커서 서버 방화벽에 의해 전송이 차단되었습니다.');
        }

        const ext = file.name.split('.').pop() || 'png';
        fileName = `map-${Date.now()}.${ext}`;
        fileToUpload = file;
      }

      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sidex_images')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('sidex_images')
        .getPublicUrl(filePath);

      // 업로드 URL과 원래 올렸던 오리지널 한글 파일명을 파이프(|) 구분자로 합쳐서 DB에 안전 저장
      const dbValue = `${publicUrl}|${file.name}`;

      const { error: dbError } = await supabase
        .from('sidex_map')
        .upsert({ id: 1, image_url: dbValue });

      if (dbError) throw dbError;

      // 데이터 무효화하여 새로운 맵 정보를 캐시 갱신
      queryClient.invalidateQueries({ queryKey: ['mapData'] });
      alert('지도가 성공적으로 업데이트되었습니다! 🗺️');
    } catch (error: any) {
      console.error('Error uploading map:', error);
      alert(`🚨 지도 업로드 차단됨\n\n사유: ${error.message || '네트워크 오류 또는 파일이 너무 큽니다.'}\n\n💡 해결 방법:\n해당 PNG 파일은 인쇄용 특수 포맷이거나 용량이 너무 큽니다. 그림판, 캡처 도구, 또는 맥의 미리보기 프로그램에서 해당 지도를 여신 후 [JPG (또는 JPEG)] 포맷으로 '다른 이름으로 저장' 하셔서 다시 올려주시면 1초 만에 등록됩니다!`);
    } finally {
      setUploadingMap(false);
    }
  };



  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isServerOn && nickname !== '만두') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: '40px 20px',
        gap: '16px'
      }}>
        <div style={{
          fontSize: '4rem',
          animation: 'bounce 2s infinite',
          marginBottom: '10px'
        }}>
          ⚠️
        </div>
        <h2 style={{
          fontSize: '1.4rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          margin: 0
        }}>
          지금은 서버를 이용할 수 없습니다.
        </h2>
        <p style={{
          fontSize: '0.95rem',
          color: 'var(--text-muted)',
          margin: 0,
          lineHeight: '1.6',
          maxWidth: '300px'
        }}>
          서버가 일시 중지된 상태이거나 점검 중입니다. 원장님/관리자에게 문의해 주세요.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('sidex_nickname');
            navigate('/login');
          }}
          style={{
            marginTop: '10px',
            background: '#F1F5F9',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#64748B',
            cursor: 'pointer'
          }}
        >
          다른 계정으로 로그인
        </button>
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>원장님들의 추천템 모아보기</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>👤 {nickname}</span>
          {nickname === '만두' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isServerOn ? '#10B981' : '#64748B' }}>
                {isServerOn ? '서버 ON' : '서버 OFF'}
              </span>
              <button
                onClick={handleToggleServer}
                style={{
                  width: '42px',
                  height: '24px',
                  borderRadius: '12px',
                  background: isServerOn ? '#10B981' : '#CBD5E1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 0,
                  transition: 'background-color 0.2s',
                  outline: 'none'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: isServerOn ? '21px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>
          )}
          {nickname === '만두' && (
            <button 
              onClick={handleChangePin}
              style={{
                background: '#F1F5F9',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--primary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#E2E8F0'}
              onMouseOut={(e) => e.currentTarget.style.background = '#F1F5F9'}
            >
              PIN 변경
            </button>
          )}
          <button 
            onClick={handleLogout}
            style={{
              background: '#FFF1F2',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#F43F5E',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#FFE4E6'}
            onMouseOut={(e) => e.currentTarget.style.background = '#FFF1F2'}
          >
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button 
          onClick={() => setShowMap(!showMap)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 14px',
            background: showMap ? '#EEF2FF' : 'white',
            border: `1px solid ${showMap ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '10px',
            color: showMap ? 'var(--primary)' : 'var(--text-main)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Image size={18} />
          <span>{showMap ? '지도 접기' : '지도 보기'}</span>
          {showMap ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {nickname === '만두' && (
          <>
            <button 
              onClick={() => mapInputRef.current?.click()}
              disabled={uploadingMap}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {uploadingMap ? <div className="loader" style={{ width: '16px', height: '16px', borderColor: '#cbd5e1', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }}></div> : <Upload size={18} />}
              <span>{uploadingMap ? '업로드 중...' : '지도 등록'}</span>
            </button>
            <input 
              type="file" 
              accept="image/*" 
              ref={mapInputRef} 
              onChange={handleMapUpload} 
              style={{ display: 'none' }} 
            />
          </>
        )}
      </div>

      {/* 지도 아코디언 영역 */}
      {showMap && (
        <div style={{ 
          background: 'white', 
          border: '1px solid var(--border)', 
          borderRadius: '16px', 
          padding: '16px', 
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {mapUrl ? (
            <div 
              style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: '12px', cursor: 'zoom-in' }}
              onClick={() => setIsFullscreenMapOpen(true)}
            >
              <img 
                src={mapUrl} 
                alt="전시장 지도" 
                style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block', transition: 'transform 0.2s' }} 
              />
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-muted)', 
                textAlign: 'center', 
                marginTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'center'
              }}>
                <span style={{ 
                  fontWeight: 600, 
                  color: 'var(--primary)', 
                  background: 'var(--primary-light)', 
                  padding: '4px 12px', 
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  maxWidth: '90%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  현재 등록 파일: {mapFileName || '전시장 지도'}
                </span>
                <span>💡 이미지를 클릭하면 전체 화면에서 확대해 볼 수 있습니다.</span>
              </div>
            </div>
          ) : (
            <div style={{ 
              height: '150px', 
              border: '2px dashed var(--border)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              textAlign: 'center',
              padding: '20px'
            }}>
              등록된 지도가 없습니다.<br/>우측의 '지도 등록' 버튼으로 지도를 올려주세요!
            </div>
          )}
        </div>
      )}

      {/* 인스타그램 스토리 활동 원장님들 일람 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        overflowX: 'auto',
        padding: '8px 4px 16px 4px',
        marginBottom: '16px',
        borderBottom: '1px solid #F1F5F9',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        {/* 전체보기 스토리 단추 */}
        <div 
          onClick={() => setSelectedUserFilter(null)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: selectedUserFilter === null 
              ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
              : '#E2E8F0',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: selectedUserFilter === null ? 'var(--primary)' : '#64748B',
              border: '2px solid white'
            }}>
              전체
            </div>
          </div>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: selectedUserFilter === null ? 700 : 500,
            color: selectedUserFilter === null ? 'var(--text-main)' : 'var(--text-muted)'
          }}>
            전체글
          </span>
        </div>

        {/* 개별 원장님 스토리 단추들 */}
        {getActiveUsers().map((user) => {
          const isSelected = selectedUserFilter === user;
          const isMe = user === nickname;
          
          const colors = [
            { bg: '#EEF2FF', text: '#4F46E5' },
            { bg: '#FDF2F8', text: '#DB2777' },
            { bg: '#ECFDF5', text: '#059669' },
            { bg: '#FFF7ED', text: '#EA580C' },
            { bg: '#FAF5FF', text: '#9333EA' }
          ];
          const colorIndex = (user.charCodeAt(0) + (user.charCodeAt(1) || 0)) % colors.length;
          const colorPair = colors[colorIndex];

          return (
            <div 
              key={user}
              onClick={() => setSelectedUserFilter(isSelected ? null : user)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                flexShrink: 0,
                position: 'relative',
                transition: 'transform 0.15s ease'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: isSelected 
                  ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
                  : (isMe ? 'linear-gradient(135deg, #818CF8, #C084FC)' : '#E2E8F0'),
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: colorPair.bg,
                  color: colorPair.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '2px solid white'
                }}>
                  {user.substring(0, 2)}
                </div>
              </div>
              
              {/* 활동 중 뱃지 표시 */}
              <div style={{
                position: 'absolute',
                bottom: '22px',
                right: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
              }} />

              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? 'var(--text-main)' : 'var(--text-muted)'
              }}>
                {user === nickname ? '나' : (user.length > 4 ? `${user.substring(0, 3)}..` : user)}
              </span>
            </div>
          );
        })}
      </div>

      {selectedUserFilter && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: '#EEF2FF',
          borderRadius: '10px',
          border: '1px solid #C7D2FE',
          marginBottom: '16px',
          fontSize: '0.85rem'
        }}>
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
            🔍 {selectedUserFilter} 원장님의 추천템만 모아보고 있습니다
          </span>
          <button 
            onClick={() => setSelectedUserFilter(null)}
            style={{
              background: 'white',
              border: '1px solid #C7D2FE',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--primary)',
              cursor: 'pointer'
            }}
          >
            전체 보기
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #E2E8F0' }}>
          아직 추천된 물품이 없습니다.<br/>첫 번째로 추천해 보세요!
        </div>
      ) : (
        <div className="feed-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(selectedUserFilter ? items.filter(item => item.recommender_name === selectedUserFilter) : items).map(item => (
            <div key={item.id} className="feed-card" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
              <ImageSlider image_url={item.image_url} item_name={item.item_name} />
              
              {/* 인스타그램 감성 하트 & 좋아요 액션 바 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px 16px 0px 16px',
                borderTop: '1px solid #FAFAFA'
              }}>
                <button 
                  onClick={() => handleToggleLike(item.id, !!item.isLikedByMe)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    padding: 0, 
                    cursor: 'pointer', 
                    color: item.isLikedByMe ? '#FF2F40' : '#262626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.1s ease',
                    outline: 'none'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.85)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Heart size={24} fill={item.isLikedByMe ? '#FF2F40' : 'none'} style={{ transition: 'all 0.2s' }} />
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#262626' }}>
                  좋아요 {item.likesCount || 0}개
                </span>
              </div>

              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>{item.item_name}</h3>
                  {(item.recommender_name === nickname || nickname === '만두') && (
                    <div style={{ position: 'relative' }}>
                      <button 
                        onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                        style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {activeMenu === item.id && (
                        <>
                          <div 
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} 
                            onClick={() => setActiveMenu(null)}
                          />
                          <div style={{ 
                            position: 'absolute', right: 0, top: '30px', background: 'white', borderRadius: '8px', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid var(--border)', zIndex: 10,
                            minWidth: '120px', overflow: 'hidden'
                          }}>
                            <button 
                              onClick={() => { setActiveMenu(null); setEditingItem(item); }}
                              style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            >
                              <Edit2 size={16} /> 수정하기
                            </button>
                            <button 
                              onClick={() => { setActiveMenu(null); handleDelete(item.id); }}
                              style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', color: '#EF4444' }}
                            >
                              <Trash2 size={16} /> 삭제하기
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {item.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: '#64748B', marginBottom: '12px' }}>
                    <MapPin size={16} />
                    <span>{item.location}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: '20px', fontWeight: 500, color: 'var(--primary)' }}>
                    👤 {item.recommender_name || '익명'}
                  </span>
                  <span>
                    {new Date(item.created_at).toLocaleString('ko-KR', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>

              {/* 인스타그램 스타일 간소화 댓글 트리거 */}
              <div style={{ padding: '12px 16px', background: 'white' }}>
                {item.sidex_comments && item.sidex_comments.length > 0 ? (
                  <button 
                    onClick={() => setActiveCommentItemId(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      outline: 'none'
                    }}
                  >
                    댓글 {item.sidex_comments.length}개 모두 보기...
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveCommentItemId(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      outline: 'none'
                    }}
                  >
                    첫 번째로 의견을 남겨주세요... 💬
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <button 
        className="fab-button"
        onClick={() => navigate('/add')}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: 'calc(50% - 240px + 30px)', // 중앙 정렬된 앱 컨테이너 기준
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'all 0.2s ease'
        }}
      >
        <PlusCircle size={32} />
      </button>

      {/* 모바일 화면에서 버튼 위치 조정을 위한 미디어 쿼리용 인라인 스타일 */}
      <style>{`
        @media (max-width: 480px) {
          .fab-button {
            right: 30px !important;
          }
        }
        .fab-button:hover {
          transform: scale(1.05);
        }
        .fab-button:active {
          transform: scale(0.95);
        }
      `}</style>

      {/* 전체 화면 지도 모달 */}
      {isFullscreenMapOpen && mapUrl && (
        <FullscreenMapModal imageUrl={mapUrl} onClose={() => setIsFullscreenMapOpen(false)} />
      )}

      {/* 수정 모달 */}
      {editingItem && (
        <EditItemModal 
          item={editingItem} 
          onClose={() => setEditingItem(null)} 
          onSuccess={() => {
            setEditingItem(null);
            queryClient.invalidateQueries({ queryKey: ['feedItems'] });
          }}
        />
      )}

      {/* 인스타그램형 댓글 바텀 시트 */}
      {activeCommentItemId !== null && (
        <CommentsBottomSheetModal 
          itemId={activeCommentItemId} 
          onClose={() => setActiveCommentItemId(null)} 
          items={items}
          nickname={nickname}
          commentInputs={commentInputs}
          setCommentInputs={setCommentInputs}
          submittingComment={submittingComment}
          setSubmittingComment={setSubmittingComment}
        />
      )}
    </div>
  );
};

// 1_2. 인스타그램 감성 하프 바텀 시트 댓글 모달 컴포넌트
interface CommentsBottomSheetProps {
  itemId: number;
  onClose: () => void;
  items: SidexItem[];
  nickname: string;
  commentInputs: { [key: number]: string };
  setCommentInputs: React.Dispatch<React.SetStateAction<{ [key: number]: string }>>;
  submittingComment: { [key: number]: boolean };
  setSubmittingComment: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>;
}

const CommentsBottomSheetModal: React.FC<CommentsBottomSheetProps> = ({
  itemId,
  onClose,
  items,
  nickname,
  commentInputs,
  setCommentInputs,
  submittingComment,
  setSubmittingComment
}) => {
  const queryClient = useQueryClient();
  const item = items.find(i => i.id === itemId);
  if (!item) return null;

  const handleAddComment = async () => {
    const commentContent = commentInputs[itemId]?.trim();
    if (!commentContent) return;

    setSubmittingComment(prev => ({ ...prev, [itemId]: true }));

    // 낙관적 업데이트
    queryClient.setQueryData(['feedItems'], (oldData: any) => {
      if (!oldData) return oldData;
      return oldData.map((oldItem: any) => {
        if (oldItem.id === itemId) {
          return {
            ...oldItem,
            sidex_comments: [
              ...(oldItem.sidex_comments || []),
              {
                id: Date.now(), // 임시 UI 표시용 ID
                commenter_name: nickname,
                content: commentContent,
                created_at: new Date().toISOString()
              }
            ]
          };
        }
        return oldItem;
      });
    });

    try {
      const { error } = await supabase
        .from('sidex_comments')
        .insert([
          {
            item_id: itemId,
            commenter_name: nickname,
            content: commentContent
          }
        ]);

      if (error) throw error;

      // 입력창 비우기
      setCommentInputs(prev => ({ ...prev, [itemId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [itemId]: false }));
      // 백그라운드 서버 재동기화
      queryClient.invalidateQueries({ queryKey: ['feedItems'] });
    }
  };

  return (
    <>
      {/* 백드롭 어두운 배경 */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />
      
      {/* 인스타그램형 바텀 시트 */}
      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '500px', // 앱 전체 폭 기준
          height: '75vh',
          background: 'white',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.15)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
          overflow: 'hidden'
        }}
      >
        {/* 인스타용 상단 손잡이 핸들 */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '10px 0 4px 0' }}>
          <div style={{ width: '40px', height: '4px', background: '#E2E8F0', borderRadius: '2px' }} />
        </div>

        {/* 바텀 시트 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #F1F5F9'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, textAlign: 'center', flex: 1, marginLeft: '24px' }}>댓글</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {/* 댓글 스크롤 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {item.sidex_comments && item.sidex_comments.length > 0 ? (
            item.sidex_comments.map(comment => (
              <div key={comment.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* 닉네임 아바타 원형 */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: comment.commenter_name === '만두' ? 'var(--primary)' : '#E2E8F0',
                  display: 'flex', alignItems: 'center', color: comment.commenter_name === '만두' ? 'white' : '#475569',
                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, justifyContent: 'center'
                }}>
                  {comment.commenter_name.slice(0, 2)}
                </div>
                {/* 댓글 본문 */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>{comment.commenter_name}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                      {new Date(comment.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#334155', margin: 0, lineHeight: '1.4', wordBreak: 'break-all' }}>{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', gap: '8px' }}>
              <MessageSquare size={36} color="#CBD5E1" />
              <span style={{ fontSize: '0.9rem' }}>아직 댓글이 없습니다. 첫 마디를 나누어 보세요!</span>
            </div>
          )}
        </div>

        {/* 댓글 입력 고정 하단바 */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #F1F5F9',
          background: 'white',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <input 
            type="text"
            className="text-input"
            style={{ 
              padding: '12px 16px', 
              borderRadius: '24px', 
              fontSize: '0.9rem', 
              flex: 1, 
              height: '44px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC'
            }}
            placeholder="댓글 추가..."
            value={commentInputs[itemId] || ''}
            onChange={(e) => setCommentInputs(prev => ({ ...prev, [itemId]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
          />
          <button 
            onClick={handleAddComment}
            disabled={submittingComment[itemId] || !commentInputs[itemId]?.trim()}
            style={{
              background: commentInputs[itemId]?.trim() ? 'var(--primary)' : 'none',
              color: commentInputs[itemId]?.trim() ? 'white' : '#94A3B8',
              border: 'none',
              borderRadius: commentInputs[itemId]?.trim() ? '24px' : 'none',
              padding: commentInputs[itemId]?.trim() ? '10px 16px' : '0',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              height: '44px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            게시
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); }
          to { transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
};

// 1. 스마트폰 갤러리 방식 (풀스크린 핀치 줌) 구현 서브 컴포넌트
interface FullscreenMapProps {
  imageUrl: string;
  onClose: () => void;
}

const FullscreenMapModal: React.FC<FullscreenMapProps> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // 모바일/PC 드래그 제어
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number }[]>([]);
  const startDistRef = useRef(0);
  const startScaleRef = useRef(1);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastTouchTimeRef = useRef(0);

  // 더블 클릭/더블 탭 토글 줌
  const handleZoomToggle = (clientX: number, clientY: number) => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(3);
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const dx = (windowWidth / 2 - clientX) * 2;
      const dy = (windowHeight / 2 - clientY) * 2;
      setPosition({ x: dx, y: dy });
    }
  };

  // 모바일 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    const now = Date.now();

    // 더블 탭 감지 (300ms 이내 두 번 탭)
    if (touches.length === 1 && now - lastTouchTimeRef.current < 300) {
      handleZoomToggle(touches[0].clientX, touches[0].clientY);
      lastTouchTimeRef.current = 0;
      return;
    }
    if (touches.length === 1) {
      lastTouchTimeRef.current = now;
    }

    if (touches.length === 1) {
      touchStartRef.current = [{ x: touches[0].clientX, y: touches[0].clientY }];
      startPosRef.current = { ...position };
    } else if (touches.length === 2) {
      touchStartRef.current = [
        { x: touches[0].clientX, y: touches[0].clientY },
        { x: touches[1].clientX, y: touches[1].clientY }
      ];
      startScaleRef.current = scale;
      startDistRef.current = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      startPosRef.current = { ...position };
    }
  };

  // 모바일 터치 이동
  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    if (touches.length === 1 && touchStartRef.current.length === 1) {
      const dx = touches[0].clientX - touchStartRef.current[0].x;
      const dy = touches[0].clientY - touchStartRef.current[0].y;
      setPosition({
        x: startPosRef.current.x + dx,
        y: startPosRef.current.y + dy
      });
    } else if (touches.length === 2 && touchStartRef.current.length === 2) {
      const currentDist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      const factor = currentDist / startDistRef.current;
      // 최대 15배 줌으로 상향 조정
      const newScale = Math.max(1, Math.min(startScaleRef.current * factor, 15));
      setScale(newScale);

      const centerX = (touches[0].clientX + touches[1].clientX) / 2;
      const centerY = (touches[0].clientY + touches[1].clientY) / 2;
      const startCenterX = (touchStartRef.current[0].x + touchStartRef.current[1].x) / 2;
      const startCenterY = (touchStartRef.current[0].y + touchStartRef.current[1].y) / 2;
      const dx = centerX - startCenterX;
      const dy = centerY - startCenterY;
      setPosition({
        x: startPosRef.current.x + dx,
        y: startPosRef.current.y + dy
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = [];
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // PC 마우스 휠 줌 (최대 15배)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    let newScale = scale;
    if (e.deltaY < 0) {
      newScale = Math.min(scale * zoomFactor, 15);
    } else {
      newScale = Math.max(1, scale / zoomFactor);
    }
    setScale(newScale);
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // PC 마우스 드래그 시작 (패닝)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  // PC 마우스 드래그 이동
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.95)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        overflow: 'hidden'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 1010
      }}>
        <button 
          onClick={reset}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          원래 크기
        </button>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          ✕
        </button>
      </div>

      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={(e) => handleZoomToggle(e.clientX, e.clientY)}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
        }}
      >
        <img 
          src={imageUrl} 
          alt="전시장 지도 풀스크린" 
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: (touchStartRef.current.length === 0 && !isDragging) ? 'transform 0.15s ease-out' : 'none',
            userSelect: 'none'
          }} 
        />
      </div>

      <div style={{
        position: 'absolute',
        bottom: '30px',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.85rem',
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 1010,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <span>📱 모바일: 두 손가락 핀치 줌 / 더블 탭 토글 줌</span>
        <span>💻 PC: 마우스 휠 스크롤 줌 / 드래그 이동 / 더블 클릭 토글 줌</span>
      </div>
    </div>
  );
};

// 수정 모달 서브 컴포넌트
interface EditItemProps {
  item: SidexItem;
  onClose: () => void;
  onSuccess: () => void;
}

const EditItemModal: React.FC<EditItemProps> = ({ item, onClose, onSuccess }) => {
  const [name, setName] = useState(item.item_name);
  const [location, setLocation] = useState(item.location || '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(item.image_url ? item.image_url.split(',')[0] : '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
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
              if (blob) resolve(blob);
              else reject(new Error('Canvas to Blob failed'));
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

  const handleSave = async () => {
    if (!name.trim()) return alert('물품명을 입력해주세요.');
    setLoading(true);
    try {
      let imageUrl = item.image_url;

      // 새 사진이 있다면 압축 후 업로드
      if (photo) {
        const compressedBlob = await compressImage(photo, 1200, 0.7);
        const compressedFile = new File([compressedBlob], `item-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const filePath = `public/item-${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage.from('sidex_images').upload(filePath, compressedFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('sidex_images').getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('sidex_items').update({
        item_name: name.trim(),
        location: location.trim() || null,
        image_url: imageUrl
      }).eq('id', item.id);

      if (error) throw error;
      alert('수정되었습니다! 🎉');
      onSuccess();
    } catch (error) {
      console.error('Error updating:', error);
      alert('수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: 'white', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>추천템 수정</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="#64748B" /></button>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '100%', height: '200px', borderRadius: '16px', background: '#F1F5F9', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
        >
          <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="미리보기" />
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'white', padding: '10px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <Edit2 size={20} color="var(--primary)" />
          </div>
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoChange} style={{ display: 'none' }} />

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>물품명 (필수)</label>
          <input className="text-input" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>판매 장소 / 부스</label>
          <input className="text-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="예: HALL C 123" />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#F1F5F9', color: '#64748B', fontWeight: 600, border: 'none', cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ flex: 2, padding: '14px', borderRadius: '12px', opacity: loading ? 0.7 : 1 }}>
            {loading ? '저장 중...' : '저장 완료'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Feed;
