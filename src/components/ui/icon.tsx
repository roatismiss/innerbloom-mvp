import Svg, { Path } from 'react-native-svg';

export interface IconProps {
  /** `ion:` and `feather:` prefixes are accepted for legacy callers. */
  name?: string;
  size?: number;
  color: string;
}

export function Icon({ name = 'circle', size = 22, color }: IconProps) {
  const key = name.replace(/^ion:/, '').replace(/^feather:/, '');

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {iconPath(key, color)}
    </Svg>
  );
}

function iconPath(name: string, color: string) {
  if (name.includes('leaf')) {
    return (
      <Path
        d="M5.2 18.8 C5.8 9.2 12.3 4.7 20 4 C19.3 11.7 14.8 18.2 5.2 18.8 Z M5.4 18.6 C8.6 14.8 12.2 11.4 16.8 8.8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (name.includes('bell')) {
    return (
      <>
        <Path
          d="M6.5 17 H17.5 L16.3 15.5 V11 C16.3 8 14.5 6 12 6 C9.5 6 7.7 8 7.7 11 V15.5 Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M10.2 19 C10.6 19.9 11.2 20.3 12 20.3 C12.8 20.3 13.4 19.9 13.8 19"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (name.includes('heart')) {
    return (
      <Path
        d="M12 19.2 C8.1 16 5 13.3 5 9.8 C5 7.8 6.4 6.3 8.4 6.3 C9.6 6.3 10.8 6.9 12 8.2 C13.2 6.9 14.4 6.3 15.6 6.3 C17.6 6.3 19 7.8 19 9.8 C19 13.3 15.9 16 12 19.2 Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    );
  }

  if (name.includes('home') || name.includes('house')) {
    return (
      <Path
        d="M4 11.2 L12 4.8 L20 11.2 V19 H14.8 V14 H9.2 V19 H4 Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (name.includes('play')) {
    return (
      <Path
        d="M8 5.8 V18.2 L18 12 Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    );
  }

  if (name.includes('person') || name.includes('user')) {
    return (
      <>
        <Path
          d="M12 12.2 A3.6 3.6 0 1 0 12 5 A3.6 3.6 0 1 0 12 12.2"
          stroke={color}
          strokeWidth={1.8}
        />
        <Path
          d="M5.8 19 C6.8 16.4 9 15 12 15 C15 15 17.2 16.4 18.2 19"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (name.includes('camera') || name.includes('bloom')) {
    return (
      <Path
        d="M12 20 C10.5 16.7 8 15.2 4.5 15.1 C6.1 12.5 8.2 11.5 10.8 12 M12 20 C13.5 16.7 16 15.2 19.5 15.1 C17.9 12.5 15.8 11.5 13.2 12 M12 20 V10 M12 10 C9.7 8.6 9.5 5.8 12 3.8 C14.5 5.8 14.3 8.6 12 10 Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  return (
    <Path
      d="M12 20 A8 8 0 1 0 12 4 A8 8 0 1 0 12 20"
      stroke={color}
      strokeWidth={1.8}
    />
  );
}
