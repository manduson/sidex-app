import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, CheckCircle2, Clock } from 'lucide-react';

interface SidexItem {
  id: number;
  item_name: string;
  image_url: string;
  is_purchased: boolean;
  created_at: string;
}

const Admin = () => {
  const [items, setItems] = useState<SidexItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();

    // Set up realtime subscription
    const subscription = supabase
      .channel('sidex_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sidex_items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sidex_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePurchase = async (id: number, currentStatus: boolean) => {
    try {
      // Optimistic update
      setItems(items.map(item => item.id === id ? { ...item, is_purchased: !currentStatus } : item));
      
      const { error } = await supabase
        .from('sidex_items')
        .update({ is_purchased: !currentStatus })
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating purchase status:', error);
      // Revert on error
      fetchItems();
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="admin-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>구매 리스트 ({items.length})</h2>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #E2E8F0' }}>
          아직 올라온 물품이 없습니다.
        </div>
      ) : (
        items.map(item => (
          <div key={item.id} className="item-card" style={{ opacity: item.is_purchased ? 0.6 : 1 }}>
            <img src={item.image_url} alt={item.item_name} className="item-image" />
            <div className="item-content">
              <div className="item-name">{item.item_name}</div>
              <div className="item-date">
                {new Date(item.created_at).toLocaleString('ko-KR', { 
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}
              </div>
              <div className="item-actions">
                <label className="custom-checkbox">
                  <input 
                    type="checkbox" 
                    checked={item.is_purchased}
                    onChange={() => togglePurchase(item.id, item.is_purchased)}
                  />
                  <div className="checkmark">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  {item.is_purchased ? (
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={16}/> 구매 완료</span>
                  ) : (
                    <span style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={16}/> 미구매</span>
                  )}
                </label>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Admin;
