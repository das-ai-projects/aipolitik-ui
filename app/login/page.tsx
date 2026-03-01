'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';

const carouselSlides = [
  {
    image: 'https://ddk4x72zkug5e.cloudfront.net/carousel_images/carousel_image1.png',
    text: 'Know where your favorite leaders and MPs stand on the issues. Anytime, anywhere.',
  },
  {
    image: 'https://ddk4x72zkug5e.cloudfront.net/carousel_images/carousel_image2.png',
    text: 'Set up debates between the political stars of the day, on demand.',
  },
  {
    image: 'https://ddk4x72zkug5e.cloudfront.net/carousel_images/carousel_image3.png',
    text: 'Get a direct line to your representatives like never before.',
  },
];

function AuthContent() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if already authenticated
    router.push('/');
  }, [router]);

  return (
    <div className="text-center py-4">
      <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
        <span className="sr-only">Loading...</span>
      </div>
      <p className="mt-3 text-slate-600">Redirecting to dashboard...</p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          // User is already logged in, redirect to home
          router.push('/');
        }
      } catch (error) {
        // User is not authenticated, stay on login page
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, [router]);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-800">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-white/20 border-t-white" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">

      <div className="flex flex-1 overflow-hidden">

        {/* Left: Logo, subtitle, and carousel */}
        <div className="hidden md:flex flex-col flex-1 items-center justify-center bg-slate-900 px-10 py-12 gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <Image
              src="https://ddk4x72zkug5e.cloudfront.net/logo_images/aipolitik_prototype_image.png"
              alt="AIPolitik"
              width={280}
              height={82}
              style={{ objectFit: 'contain', height: 'auto' }}
              priority
              className="shrink-0"
            />
            <p className="text-slate-300 text-lg font-medium whitespace-nowrap">
              Instant chats and debates with the leaders of the day
            </p>
          </div>
          <Carousel
            setApi={setApi}
            opts={{ loop: true }}
            plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
            className="w-full max-w-5xl"
          >
            <CarouselContent>
              {carouselSlides.map((slide, index) => (
                <CarouselItem key={index}>
                  <div className="relative rounded-2xl aspect-[3/2] shadow-2xl">
                    <Image
                      src={slide.image}
                      alt={`Slide ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute bottom-5 left-0 right-0 px-6">
                      <p className="text-white text-lg font-semibold leading-snug drop-shadow-lg">
                        {slide.text}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Dot indicators */}
          <div className="flex gap-2">
            {carouselSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === current ? 'bg-white w-6' : 'bg-white/40 w-1.5'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right: Authenticator
            Outer div = scroll container.
            Inner div = min-h-full centering wrapper so justify-center
            always has a definite height to work against.
        */}
        <div className="w-full md:w-2/5 shrink-0 bg-white overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-10 py-12">
            <div className="w-full max-w-sm">

              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
                <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue.</p>
              </div>

              <Authenticator 
                hideSignUp={false}
                loginMechanisms={['email']}
                signUpAttributes={[
                  'name',
                ]}
              >
                {() => <AuthContent />}
              </Authenticator>

              <p className="mt-8 text-center text-xs text-slate-400">
                Protected by AWS Cognito
              </p>

            </div>
          </div>
        </div>

      </div>

      {/* ── Authenticator styles ── */}
      <style jsx global>{`
        [data-amplify-authenticator] {
          --amplify-components-authenticator-router-box-shadow: none;
          --amplify-components-authenticator-router-border-width: 0;
          --amplify-components-button-primary-background-color: rgb(34 197 94);
          --amplify-components-button-primary-hover-background-color: rgb(22 163 74);
          --amplify-components-fieldcontrol-focus-border-color: rgb(34 197 94);
          --amplify-components-tabs-item-active-color: rgb(34 197 94);
          --amplify-components-tabs-item-active-border-color: rgb(34 197 94);
          --amplify-colors-background-primary: transparent;
          width: 100%;
        }

        [data-amplify-authenticator] [data-amplify-router] {
          border: none;
          box-shadow: none;
          background: transparent;
          padding: 0;
          width: 100%;
        }

        [data-amplify-authenticator] .amplify-button--primary {
          border-radius: 0.5rem;
          font-weight: 600;
          transition: background-color 0.15s, transform 0.15s;
        }

        [data-amplify-authenticator] .amplify-button--primary:hover {
          transform: translateY(-1px);
        }

        [data-amplify-authenticator] .amplify-input {
          border-radius: 0.5rem;
          border-color: rgb(226 232 240);
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        [data-amplify-authenticator] .amplify-input:focus {
          border-color: rgb(34 197 94);
          box-shadow: 0 0 0 3px rgb(34 197 94 / 0.15);
        }

        [data-amplify-authenticator] .amplify-tabs {
          margin-bottom: 1.25rem;
          border-bottom: 1px solid rgb(226 232 240);
        }

        [data-amplify-authenticator] .amplify-tabs-item {
          font-weight: 500;
          font-size: 0.875rem;
          color: rgb(100 116 139);
        }

        [data-amplify-authenticator] .amplify-field-group__label {
          font-weight: 500;
          font-size: 0.875rem;
          color: rgb(51 65 85);
        }

        [data-amplify-authenticator] .amplify-button--link {
          color: rgb(34 197 94);
          font-weight: 500;
          font-size: 0.875rem;
        }

        [data-amplify-authenticator] .amplify-button--link:hover {
          color: rgb(22 163 74);
        }
      `}</style>
    </div>
  );
}
