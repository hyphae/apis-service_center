# Generated by Django 2.2.11 on 2020-09-07 01:36

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Scenario',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('community_id', models.CharField(blank=True, max_length=128, null=True)),
                ('cluster_id', models.CharField(blank=True, max_length=128, null=True)),
                ('unit_id', models.CharField(blank=True, max_length=128, null=True)),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('name', models.CharField(max_length=128)),
                ('description', models.TextField(blank=True, null=True)),
                ('data', models.TextField(blank=True, null=True)),
            ],
            options={
                'unique_together': {('community_id', 'cluster_id', 'unit_id', 'name')},
            },
        ),
        migrations.CreateModel(
            name='Choice',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('community_id', models.CharField(max_length=128)),
                ('cluster_id', models.CharField(max_length=128)),
                ('unit_id', models.CharField(max_length=128)),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('scenario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='scenario.Scenario')),
            ],
        ),
    ]
