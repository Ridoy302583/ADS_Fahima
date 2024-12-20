import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-dark text-white py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-8 md:mb-0">
            <h3 className="text-3xl font-bold mb-2">DataAI</h3>
            <p className="text-gray-400">Automatic Data Analysis System</p>
          </div>
          <div className="text-center md:text-right">
            <p className="mb-2">&copy; 2024 DataAI. All rights reserved.</p>
            <p className="text-gray-400">Designed by Fahima Akter</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
