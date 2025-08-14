// SPDX-License-Identifier: MIT
// Copyright (c) 2025, CodeMagic LTD

import { MessagePortTransport } from './message-port-transport.js';
import { WokwiClient } from './wokwi-client.js';

const outputText = document.getElementById('output-text');

window.addEventListener('message', (event) => {
  const client = new WokwiClient(new MessagePortTransport(event.data.port));

  client.addEventListener('wokwi:connected', async (event) => {
    console.log('Wokwi client connected', event.detail);
    await client.serialMonitorListen();

    const response_diagram = await fetch('./diagram.json');
    console.log('Diagram JSON fetched', response_diagram);
    const diagram = await response_diagram.text();
    console.log('Diagram JSON parsed', diagram);
    await client.fileUpload('diagram.json', diagram);

    const response_jaculus = await fetch('./jaculus.uf2');
    const jaculusBinContent = await response_jaculus.arrayBuffer();
    await client.fileUpload('jaculus.uf2', new Uint8Array(jaculusBinContent));
  });

  client.addEventListener('serial-monitor:data', (event) => {
    const rawBytes = new Uint8Array(event.detail.bytes);
    outputText.textContent += new TextDecoder().decode(rawBytes);
  });

  document.querySelector('.start-button').addEventListener('click', () => {
    client.simStart({
      firmware: 'jaculus.uf2',
    });
  });
});
console.log('Wokwi ESP32 MicroPython script loaded');
