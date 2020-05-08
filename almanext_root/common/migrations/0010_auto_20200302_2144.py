# Generated by Django 2.2.10 on 2020-03-02 21:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0009_auto_20200227_1309'),
    ]

    operations = [
        migrations.CreateModel(
            name='Band',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('designation', models.IntegerField()),
            ],
        ),
        migrations.RemoveField(
            model_name='observation',
            name='band',
        ),
        migrations.AddField(
            model_name='observation',
            name='bands',
            field=models.ManyToManyField(to='common.Band'),
        ),
    ]
