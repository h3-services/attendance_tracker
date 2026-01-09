import React, { useRef, useState, useEffect } from 'react';

// Check if WebGL is supported
const isWebGLSupported = () => {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
};

// CSS-based fallback loader (car animation with CSS)
const CSSCarLoader = () => {
    return (
        <div className="car-loader-container">
            <div className="road">
                <div className="car">
                    <div className="car-body">
                        <div className="car-top"></div>
                        <div className="headlight left"></div>
                        <div className="headlight right"></div>
                    </div>
                    <div className="wheel front"></div>
                    <div className="wheel back"></div>
                </div>
                <div className="speed-lines">
                    <div className="line"></div>
                    <div className="line"></div>
                    <div className="line"></div>
                </div>
            </div>
            <div className="flying-text">✨ provided by Hope3-Services ✨</div>

            <style>{`
        .car-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          height: 100%;
          width: 100%;
          min-height: 300px;
          position: relative;
          overflow: hidden;
        }
        
        .road {
          position: relative;
          width: 300px;
          height: 120px;
        }
        
        .car {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          animation: bounce 0.3s ease-in-out infinite alternate;
        }
        
        .car-body {
          width: 100px;
          height: 35px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 5px 20px 5px 5px;
          position: relative;
          box-shadow: 0 5px 15px rgba(15, 23, 42, 0.3);
        }
        
        .car-top {
          position: absolute;
          width: 50px;
          height: 25px;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 3px 10px 3px 3px;
          top: -20px;
          left: 25px;
        }
        
        .headlight {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #fbbf24;
          border-radius: 50%;
          right: -2px;
          box-shadow: 0 0 10px #fbbf24, 0 0 20px #fbbf24;
          animation: glow 0.5s ease-in-out infinite alternate;
        }
        
        .headlight.left { top: 8px; }
        .headlight.right { top: 20px; }
        
        .wheel {
          position: absolute;
          width: 22px;
          height: 22px;
          background: #374151;
          border-radius: 50%;
          bottom: -10px;
          border: 3px solid #1f2937;
          animation: spin 0.2s linear infinite;
        }
        
        .wheel::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          background: #6b7280;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .wheel.front { right: 10px; }
        .wheel.back { left: 10px; }
        
        .speed-lines {
          position: absolute;
          left: -30px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .line {
          width: 40px;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, #94a3b8 50%, transparent 100%);
          margin: 8px 0;
          animation: speed 0.4s linear infinite;
          opacity: 0.6;
        }
        
        .line:nth-child(1) { animation-delay: 0s; width: 30px; }
        .line:nth-child(2) { animation-delay: 0.15s; width: 45px; }
        .line:nth-child(3) { animation-delay: 0.3s; width: 35px; }
        
        .flying-text {
          margin-top: 2rem;
          font-family: 'Croissant One', serif;
          font-weight: bold;
          font-size: 1.3rem;
          background: linear-gradient(90deg, #0f172a, #3b82f6, #0f172a);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2s linear infinite, wave 1s ease-in-out infinite;
        }
        
        @keyframes bounce {
          from { transform: translate(-50%, -50%) translateY(0); }
          to { transform: translate(-50%, -50%) translateY(-3px); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes speed {
          0% { transform: translateX(0); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateX(-30px); opacity: 0; }
        }
        
        @keyframes glow {
          from { box-shadow: 0 0 5px #fbbf24, 0 0 10px #fbbf24; }
          to { box-shadow: 0 0 15px #fbbf24, 0 0 25px #fbbf24; }
        }
        
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        
        @keyframes wave {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-5px) rotate(2deg); }
        }
      `}</style>
        </div>
    );
};

// Try to load Three.js components only if WebGL is supported
let Canvas, useFrame, Box, Cylinder, Sphere, Html, Float;
let threeJsLoaded = false;

const Loader3D = () => {
    // Using CSS loader for maximum stability (no GPU/WebGL context issues)
    return <CSSCarLoader />;
};

// Three.js scene component
const ThreeScene = ({ ThreeComponents }) => {
    const { Box, Cylinder, Sphere, Html, Float, useFrame } = ThreeComponents;

    return (
        <>
            <ambientLight intensity={0.6} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <Float speed={1} rotationIntensity={0} floatIntensity={0.2}>
                <CarModel Box={Box} Cylinder={Cylinder} Sphere={Sphere} useFrame={useFrame} />
                <Html position={[-2.5, 0.8, 0]} center>
                    <div style={{
                        fontFamily: '"Croissant One", serif',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        color: '#3b82f6',
                        textShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
                        whiteSpace: 'nowrap'
                    }}>
                        ✨ provided by Hope3-Services ✨
                    </div>
                </Html>
            </Float>
        </>
    );
};

// Simple car model
const CarModel = ({ Box, Cylinder, Sphere, useFrame }) => {
    const carRef = useRef();

    useFrame((state, delta) => {
        if (carRef.current) {
            carRef.current.position.y = Math.sin(state.clock.elapsedTime * 8) * 0.03;
        }
    });

    return (
        <group ref={carRef}>
            <Box args={[2, 0.5, 1]} position={[0, 0.4, 0]}>
                <meshStandardMaterial color="#0f172a" />
            </Box>
            <Box args={[1, 0.4, 0.9]} position={[0.2, 0.85, 0]}>
                <meshStandardMaterial color="#1e293b" />
            </Box>
            <Sphere args={[0.1]} position={[1, 0.35, 0.35]}>
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
            </Sphere>
            <Sphere args={[0.1]} position={[1, 0.35, -0.35]}>
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
            </Sphere>
        </group>
    );
};

export default Loader3D;
