package com.autopulse.obd2;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(name = "BtSerial")
public class BtSerialPlugin extends Plugin {

    // Standard SPP (Serial Port Profile) UUID for RFCOMM Bluetooth
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket socket;
    private InputStream inputStream;
    private OutputStream outputStream;
    private Thread readerThread;
    private volatile boolean isReading = false;

    @Override
    public void load() {
        super.load();
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    @PluginMethod
    @SuppressLint("MissingPermission")
    public void list(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Dispositivo não possui suporte a Bluetooth.");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth está desligado. Ative nas configurações do Android.");
            return;
        }

        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devicesArray = new JSArray();

            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject devObj = new JSObject();
                    devObj.put("name", device.getName() != null ? device.getName() : "Sem Nome");
                    devObj.put("address", device.getAddress());
                    devicesArray.put(devObj);
                }
            }

            JSObject result = new JSObject();
            result.put("devices", devicesArray);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Erro ao listar dispositivos Bluetooth: " + e.getMessage());
        }
    }

    @PluginMethod
    @SuppressLint("MissingPermission")
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.trim().isEmpty()) {
            call.reject("Endereço MAC do dispositivo Bluetooth é obrigatório.");
            return;
        }

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth desligado ou indisponível.");
            return;
        }

        // Fecha conexão anterior se houver
        closeConnection();

        // Conecta em thread separada para não bloquear a UI do app
        new Thread(() -> {
            try {
                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address.trim());
                bluetoothAdapter.cancelDiscovery();

                BluetoothSocket tempSocket;
                try {
                    tempSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    tempSocket.connect();
                } catch (Exception primaryEx) {
                    // Fallback para createInsecureRfcommSocketToServiceRecord (adaptadores ELM clones)
                    try {
                        tempSocket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
                        tempSocket.connect();
                    } catch (Exception fallbackEx) {
                        throw new Exception("Falha de conexão com " + device.getName() + " (" + address + "): " + fallbackEx.getMessage());
                    }
                }

                socket = tempSocket;
                inputStream = socket.getInputStream();
                outputStream = socket.getOutputStream();

                startReaderThread();

                JSObject res = new JSObject();
                res.put("success", true);
                res.put("address", address);
                res.put("name", device.getName() != null ? device.getName() : address);
                call.resolve(res);

            } catch (Exception e) {
                closeConnection();
                call.reject(e.getMessage());
            }
        }).start();
    }

    private void startReaderThread() {
        isReading = true;
        readerThread = new Thread(() -> {
            byte[] buffer = new byte[1024];
            int bytesRead;

            try {
                while (isReading && inputStream != null) {
                    bytesRead = inputStream.read(buffer);
                    if (bytesRead > 0) {
                        String data = new String(buffer, 0, bytesRead, StandardCharsets.US_ASCII);
                        JSObject event = new JSObject();
                        event.put("value", data);
                        notifyListeners("data", event);
                    }
                }
            } catch (Exception e) {
                if (isReading) {
                    notifyListeners("disconnected", new JSObject());
                }
            } finally {
                closeConnection();
            }
        });
        readerThread.setDaemon(true);
        readerThread.start();
    }

    @PluginMethod
    public void write(PluginCall call) {
        String value = call.getString("value");
        if (value == null) {
            call.reject("Valor nulo para envio.");
            return;
        }

        if (outputStream == null) {
            call.reject("Bluetooth não conectado.");
            return;
        }

        try {
            outputStream.write(value.getBytes(StandardCharsets.US_ASCII));
            outputStream.flush();
            call.resolve();
        } catch (Exception e) {
            call.reject("Erro ao enviar dados via Bluetooth: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closeConnection();
        JSObject res = new JSObject();
        res.put("success", true);
        call.resolve(res);
    }

    private synchronized void closeConnection() {
        isReading = false;
        try {
            if (inputStream != null) {
                inputStream.close();
                inputStream = null;
            }
        } catch (Exception ignored) {}

        try {
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
        } catch (Exception ignored) {}

        try {
            if (socket != null) {
                socket.close();
                socket = null;
            }
        } catch (Exception ignored) {}

        if (readerThread != null) {
            readerThread.interrupt();
            readerThread = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        closeConnection();
    }
}
