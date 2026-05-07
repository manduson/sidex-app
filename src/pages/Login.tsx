import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [step, setStep] = useState(1); // 1: 방 선택, 2: 닉네임/PIN 입력
  const [selectedRoom, setSelectedRoom] = useState<'존경방' | '토론의장' | null>(null);
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSelectRoom = (room: '존경방' | '토론의장') => {
    setSelectedRoom(room);
    setStep(2);
    setShowPin(false);
  };

  const handleAdminDirect = () => {
    setSelectedRoom(null);
    setNickname('만두');
    setShowPin(true);
    setStep(2);
  };

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    if (val.trim() === '만두') {
      setShowPin(true);
    } else {
      setShowPin(false);
      setPin('');
    }
  };

  const handleStart = async () => {
    const trimmedNickname = nickname.trim();
    const isAdmin = trimmedNickname === '만두' || showPin;

    if (!isAdmin && !selectedRoom) {
      alert('방을 먼저 선택해주세요!');
      setStep(1);
      return;
    }

    if (!isAdmin && trimmedNickname.length === 0) {
      alert('닉네임을 입력해주세요!');
      return;
    }

    setLoading(true);

    try {
      // 1. 관리자 '만두'인 경우 PIN 검증
      if (isAdmin) {
        if (!pin) {
          alert('관리자 PIN 번호를 입력해주세요!');
          setLoading(false);
          return;
        }

        // Supabase sidex_map 테이블의 id: 2에서 동적 PIN 번호를 로드 (없을 경우 초기값 '0000')
        const { data: pinData, error: pinError } = await supabase
          .from('sidex_map')
          .select('image_url')
          .eq('id', 2)
          .maybeSingle();

        if (pinError) throw pinError;

        const currentPin = pinData?.image_url || '0000';

        if (pin !== currentPin) {
          alert('올바르지 않은 관리자 PIN 번호입니다.');
          setLoading(false);
          return;
        }

        localStorage.setItem('sidex_nickname', '만두');
        navigate('/');
      } else {
        // 2. 일반 사용자인 경우 [방이름] 닉네임 결합 및 중복 체크
        const finalNickname = `[${selectedRoom}] ${trimmedNickname}`;
        const stored = localStorage.getItem('sidex_nickname');

        if (stored !== finalNickname) {
          const { data: itemMatch, error: itemErr } = await supabase
            .from('sidex_items')
            .select('recommender_name')
            .eq('recommender_name', finalNickname)
            .limit(1);

          if (itemErr) throw itemErr;

          const { data: commentMatch, error: commentErr } = await supabase
            .from('sidex_comments')
            .select('commenter_name')
            .eq('commenter_name', finalNickname)
            .limit(1);

          if (commentErr) throw commentErr;

          if ((itemMatch && itemMatch.length > 0) || (commentMatch && commentMatch.length > 0)) {
            alert(`이미 [${selectedRoom}] 방에서 '${trimmedNickname}' 닉네임이 사용 중입니다. 다른 고유한 이름을 사용해 주세요!`);
            setLoading(false);
            return;
          }
        }

        localStorage.setItem('sidex_nickname', finalNickname);
        navigate('/');
      }
    } catch (error) {
      console.error('Error during nickname validation:', error);
      alert('로그인 검증 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '20px' }}>
      {step === 1 ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>💬 대화방 선택</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              참여하실 추천템 모아보기 대화방을<br />선택해 주세요.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {/* 존경방 카드 */}
            <div 
              onClick={() => handleSelectRoom('존경방')}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                border: '2px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ fontSize: '2rem' }}>🎓</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>존경방</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                치과의사 원장님들의 정갈한 임상 소통과 고품격 원장 추천템을 조용하게 공유하는 고즈넉한 대화방입니다.
              </p>
            </div>

            {/* 토론의장 카드 */}
            <div 
              onClick={() => handleSelectRoom('토론의장')}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                border: '2px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ fontSize: '2rem' }}>🔥</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>토론의장</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                다양한 치과 기구 및 재료에 대해 열띤 토론과 유쾌하고 솔직 담백한 실사용 팁을 편하게 나누는 대화방입니다.
              </p>
            </div>
          </div>

          <button
            onClick={handleAdminDirect}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: '10px',
              textDecoration: 'underline'
            }}
          >
            관리자 로그인
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* 뒤로가기 단추 */}
          {!showPin && (
            <button
              onClick={() => {
                setStep(1);
                setSelectedRoom(null);
                setNickname('');
              }}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '16px'
              }}
            >
              ‹ 방 다시 선택하기
            </button>
          )}

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
              {selectedRoom ? `👋 [${selectedRoom}] 입장` : '🔒 관리자 로그인'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              {selectedRoom 
                ? '대화방에서 동료 원장님들과 소통할\n닉네임(또는 병원명)을 설정해주세요.'
                : '관리자 계정 검증을 진행합니다.'}
            </p>
          </div>

          <div className="input-group" style={{ width: '100%', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!showPin ? (
              <input 
                type="text" 
                className="text-input" 
                placeholder="예: 강남유치과, 김원장" 
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '4px', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>선택된 계정</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>👤 관리자 (만두)</span>
              </div>
            )}

            {showPin && (
              <div style={{
                animation: 'slideDown 0.3s ease-out',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%'
              }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>🔒 관리자 인증 PIN 번호</label>
                <input 
                  type="password" 
                  className="text-input" 
                  placeholder="초기 PIN 번호 0000" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  disabled={loading}
                  maxLength={4}
                />
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleStart} disabled={loading} style={{ width: '100%' }}>
            {loading ? '검증 중...' : '입장하기'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
