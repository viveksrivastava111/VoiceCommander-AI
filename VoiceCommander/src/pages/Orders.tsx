import { useMemo, useState } from 'react';
import { Package, ChevronRight, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import type { OrderStatus } from '../types';
import { money } from '../utils/speech';

const tabs: Array<'All' | OrderStatus> = ['All', 'Pending', 'Confirmed', 'Delivered', 'Cancelled'];

export default function Orders() {
  const orders = useCartStore((state) => state.orders);
  const [activeTab, setActiveTab] = useState<'All' | OrderStatus>('All');

  const filteredOrders = useMemo(
    () => activeTab === 'All' ? orders : orders.filter((order) => order.status === activeTab),
    [activeTab, orders]
  );

  const emptyTitle = activeTab === 'All' ? 'No orders yet' : `No ${activeTab.toLowerCase()} orders`;
  const emptyText = activeTab === 'All'
    ? 'Your placed orders will appear here.'
    : activeTab === 'Cancelled'
      ? 'You have not cancelled any orders.'
      : `Orders marked as ${activeTab.toLowerCase()} will appear here.`;

  return (
    <div className="page orders-page">
      <h1>My Orders</h1>

      <div className="order-tabs" role="tablist" aria-label="Order status filters">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="order-list">
        {filteredOrders.length > 0 ? filteredOrders.map((order) => (
          <article className="order-card" key={order.id}>
            <div>
              <b>{order.id}</b>
              <p>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <span className={`status ${order.status.toLowerCase()}`}>{order.status}</span>
            <div className="order-bottom">
              <div>
                <strong>{money(order.total)}</strong>
                <small>{order.itemCount} {order.itemCount === 1 ? 'Item' : 'Items'}</small>
              </div>
              <Link to={`/orders/${order.id}`}>View Details <ChevronRight size={15}/></Link>
            </div>
          </article>
        )) : (
          <div className="empty-state order-empty-state">
            <ClipboardList size={32}/>
            <h2>{emptyTitle}</h2>
            <p>{emptyText}</p>
          </div>
        )}
      </div>

      <div className="support-card">
        <Package size={19}/>
        <span>Need help with your order?</span>
        <button type="button">Contact Support</button>
      </div>
    </div>
  );
}
