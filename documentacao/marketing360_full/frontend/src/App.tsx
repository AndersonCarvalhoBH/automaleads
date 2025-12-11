import React from 'react';
import { Outlet } from 'react-router-dom';

export default function App(){
  return (
    <div style={{ padding:20 }}>
      <h1>Marketing360</h1>
      <Outlet />
    </div>
  );
}
