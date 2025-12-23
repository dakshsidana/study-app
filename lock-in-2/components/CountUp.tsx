
import React, { useState, useEffect } from 'react';

interface CountUpProps {
  value: number;
}

export const CountUp: React.FC<CountUpProps> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 1000;
    const stepTime = 20;
    const totalSteps = duration / stepTime;
    const stepValue = (end - start) / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(prev => prev + stepValue);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{Math.floor(displayValue).toLocaleString()}</span>;
};
