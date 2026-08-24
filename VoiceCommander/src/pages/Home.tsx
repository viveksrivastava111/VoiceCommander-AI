import {
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  ArrowRight,
  BadgeCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';

import {
  Link,
} from 'react-router-dom';

import ProductCard from '../components/ProductCard';
import ToastStack from '../components/ToastStack';
import VoiceButton from '../components/VoiceButton';

import {
  useVoiceRecognition,
} from '../hooks/useVoiceRecognition';

import {
  useCommandExecutor,
} from '../hooks/useCommandExecutor';

import {
  useProductStore,
} from '../store/useProductStore';

import {
  useCartStore,
} from '../store/useCartStore';

import {
  storefrontCategories,
} from '../data/mockData';

import {
  NLPResult,
} from '../types';

const chips = [
  'Add 1 litre milk',
  'Show deals under ₹50',
  'Optimize my cart',
  'Set budget to 500',
  'Cook pancakes',
];

export default function Home() {
  const {
    isListening,
    transcript,
    interimTranscript,
    result,
    startListening,
    stopListening,
    processText,
    clearResult,
  } = useVoiceRecognition();

  const {
    execute,
    toasts,
    dismissToast,
  } = useCommandExecutor();

  const processedResultRef =
    useRef<NLPResult | null>(null);

  const products = useProductStore(
    (state) => state.products
  );

  const history = useProductStore(
    (state) => state.history
  );

  const searches = useProductStore(
    (state) => state.searches
  );

  const cartItems = useCartStore(
    (state) => state.items
  );

  const recs = useMemo(
    () =>
      useProductStore
        .getState()
        .getRecommendations(),
    [
      products,
      history,
      searches,
    ]
  );

  useEffect(() => {
    if (!result) {
      processedResultRef.current = null;
      return;
    }

    if (
      processedResultRef.current ===
      result
    ) {
      return;
    }

    processedResultRef.current =
      result;

    clearResult();

    execute(result);
  }, [
    result,
    execute,
    clearResult,
  ]);

  const hasActivity =
    history.length > 0 ||
    searches.length > 0 ||
    cartItems.length > 0;

  const defaultRecommendations =
    useMemo(
      () =>
        storefrontCategories
          .map((category) => {
            const allowedSubcategories =
              category.querySubcategories ||
              category.subcategories;

            const items = products
              .filter((product) => {
                if (
                  !product.available ||
                  product.category !==
                    category.value
                ) {
                  return false;
                }

                if (
                  category.value ===
                  'Other'
                ) {
                  return (
                    !!product.subcategory &&
                    allowedSubcategories.includes(
                      product.subcategory
                    )
                  );
                }

                return true;
              })
              .slice(0, 2);

            return {
              label:
                category.label,

              items,

              href:
                `/products?category=${encodeURIComponent(
                  category.label
                )}`,
            };
          })
          .filter(
            (group) =>
              group.items.length > 0
          ),
      [products]
    );

  const title =
    hasActivity
      ? 'Recommended for You'
      : 'Explore our picks';

  const subtitle =
    hasActivity
      ? 'Based on your searches, cart and previous orders.'
      : 'A couple of popular products from every category to get you started.';

  return (
    <div className="page home-page">
      <section className="hero-banner">
        <div className="hero-copy">
          <span className="hero-kicker">
            SMART GROCERY SHOPPING
          </span>

          <h1>
            Fresh Essentials,
            <br />
            Delivered Fast
          </h1>

          <p>
            Get quality groceries delivered to your doorstep.
            Search, order and manage your cart naturally
            with VoiceCart AI.
          </p>

          <Link
            to="/products"
            className="btn btn-primary mt-5"
          >
            Shop Now
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="hero-visual">
          <img
            src="/assets/home-hero.png"
            alt="Fresh groceries ready for delivery"
          />
        </div>
      </section>

      <div className="benefits">
        <div className="benefit">
          <Truck size={17} />

          <b>
            Free Delivery
          </b>

          <span>
            On orders above ₹499
          </span>
        </div>

        <div className="benefit">
          <RotateCcw size={17} />

          <b>
            Easy Returns
          </b>

          <span>
            No questions asked
          </span>
        </div>

        <div className="benefit">
          <BadgeCheck size={17} />

          <b>
            Best Quality
          </b>

          <span>
            100% original products
          </span>
        </div>

        <div className="benefit">
          <ShieldCheck size={17} />

          <b>
            Secure Payments
          </b>

          <span>
            Multiple payment options
          </span>
        </div>
      </div>

      <section className="voice-command-panel white-card">
        <div className="voice-command-copy">
          <span>
            VOICE SHOPPING
          </span>

          <h2>
            Just say it. We'll add it.
          </h2>

          <p>
            Give your whole grocery order in one flow—in
            English, Hindi or Hinglish.
          </p>
        </div>

        <div className="voice-command-action">
          <VoiceButton
            listening={isListening}
            onStart={startListening}
            onStop={stopListening}
          />

          <b className="voice-state-text">
            {
              interimTranscript ||
              transcript ||
              (
                isListening
                  ? 'Listening…'
                  : 'Speak naturally'
              )
            }
          </b>
        </div>

        <div className="command-chips">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() =>
                processText(chip)
              }
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      <section className="recommendations-section">
        <div className="section-head">
          <div>
            <h2>
              {title}
            </h2>

            <p>
              {subtitle}
            </p>
          </div>

          <Link to="/products">
            View All
          </Link>
        </div>

        {hasActivity ? (
          <div className="deal-strip">
            {recs
              .slice(0, 8)
              .map(({ product }) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
          </div>
        ) : (
          <div className="recommendation-categories">
            {defaultRecommendations.map(
              (group) => (
                <div
                  className="recommendation-category"
                  key={group.label}
                >
                  <div className="mini-section-head">
                    <h3>
                      {group.label}
                    </h3>

                    <Link
                      to={group.href}
                    >
                      See more
                    </Link>
                  </div>

                  <div className="deal-strip">
                    {group.items.map(
                      (product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                        />
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </div>
  );
}