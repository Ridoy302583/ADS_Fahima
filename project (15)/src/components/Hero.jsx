import React from 'react';
import { Link as ScrollLink } from 'react-scroll';
import { Link as RouterLink } from 'react-router-dom';

const Hero = () => {
  return (
    <section id="home" className="pt-28 md:pt-40 pb-20 bg-gradient-to-br from-primary to-secondary text-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-12 md:mb-0">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              AI-Powered Data Analysis 🧠💡
            </h1>
            <p className="text-xl mb-10 text-gray-100">
              Unlock the power of your data with our cutting-edge AI system. Get instant insights, visualizations, and predictions! 📊🚀
            </p>
            <RouterLink
              to="/analysis"
              className="btn-primary text-lg"
            >
              Get Started 🚀
            </RouterLink>
          </div>
          <div className="md:w-1/2">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <img
                src="https://images.shiksha.com/mediadata/shikshaOnline/mailers/2021/naukri-learning/oct/28oct/What-is-Data-Analysis.jpg"
                alt="Data Analysis Illustration"
                className="rounded-lg shadow-2xl w-full"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
