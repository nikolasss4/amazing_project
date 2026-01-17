import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TradeScreen } from '@features/trade/screens/TradeScreen';
import { CommunityScreen } from '@features/community/screens/CommunityScreen';
import { ImproveScreen } from '@features/improve/screens/ImproveScreen';
import { CustomTabBar } from './CustomTabBar';

export type RootTabParamList = {
  Trade: undefined;
  Community: undefined;
  Improve: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export const RootNavigator: React.FC = () => {
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
        <Tab.Screen name="Improve" component={ImproveScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
