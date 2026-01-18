import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TradeScreen } from '@features/trade/screens/TradeScreen';
import { CommunityScreen } from '@features/community/screens/CommunityScreen';
import { LearnScreen } from '@features/learn/screens/LearnScreen';
import { CustomTabBar } from './CustomTabBar';

export type RootTabParamList = {
  Trade: undefined;
  Community: undefined;
  Learn: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export const RootNavigator: React.FC = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3707a07d-55e2-4a58-b964-f5264964bf68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RootNavigator.tsx:18',message:'RootNavigator rendered',data:{registeredScreens:['Trade','Community','Learn'],hasLearnScreen:true},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Trade" component={TradeScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Learn" component={LearnScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
