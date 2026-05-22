package config

import "github.com/spf13/viper"

type Config struct {
	HubURL          string `mapstructure:"hub_url"`
	HubSecret       string `mapstructure:"hub_secret"`
	ListenAddr      string `mapstructure:"listen_addr"`
	ServerName      string `mapstructure:"server_name"`
	MetricsInterval string `mapstructure:"metrics_interval"`
	LogMaxLines     int    `mapstructure:"log_max_lines"`
	ComposeDir      string `mapstructure:"compose_dir"`
}

func Load(path string) (*Config, error) {
	v := viper.New()
	v.SetDefault("listen_addr", "0.0.0.0:9101")
	v.SetDefault("metrics_interval", "5s")
	v.SetDefault("log_max_lines", 1000)
	v.SetDefault("compose_dir", "/opt/letispos/production/server-b")
	v.SetConfigFile(path)
	if err := v.ReadInConfig(); err != nil {
		return nil, err
	}
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
