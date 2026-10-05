package com.autopulse.obd2;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BtSerialPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
